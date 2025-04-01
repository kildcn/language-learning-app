<?php

namespace App\Http\Controllers;

use App\Models\Quiz;
use App\Models\QuizAttempt;
use App\Models\SavedWord;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Arr;
use Illuminate\Database\Eloquent\ModelNotFoundException;

class QuizController extends Controller
{
    public function index(Request $request)
    {
        $quizzes = $request->user()
            ->quizzes()
            ->latest()
            ->paginate(10);

        return response()->json($quizzes);
    }

    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:100',
            'type' => 'required|in:multiple_choice,fill_blank,matching',
            'word_ids' => 'required|array',
            'word_ids.*' => 'exists:saved_words,id',
        ]);

        try {
            $words = SavedWord::whereIn('id', $request->word_ids)
                ->where('user_id', $request->user()->id)
                ->get();

            if ($words->count() === 0) {
                return response()->json([
                    'message' => 'No words selected for the quiz',
                ], 400);
            }

            $quizData = $this->createQuiz($words, $request->type);

            $quiz = Quiz::create([
                'title' => $request->title,
                'type' => $request->type,
                'user_id' => $request->user()->id,
                'questions' => $quizData,
            ]);

            return response()->json([
                'message' => 'Quiz created successfully',
                'quiz' => $quiz,
            ], 201);
        } catch (\Exception $e) {
            Log::error('Quiz creation error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'request' => $request->all()
            ]);

            return response()->json([
                'message' => 'Failed to generate quiz',
                'error' => 'An error occurred while creating the quiz'
            ], 500);
        }
    }

    private function createQuiz($words, $type)
    {
        if ($type === 'multiple_choice') {
            return $this->createMultipleChoiceQuiz($words);
        } elseif ($type === 'fill_blank') {
            return $this->createFillBlankQuiz($words);
        } elseif ($type === 'matching') {
            return $this->createMatchingQuiz($words);
        }

        // Default fallback
        return $this->createMultipleChoiceQuiz($words);
    }

    private function createMultipleChoiceQuiz($words)
    {
        $questions = [];
        $allWords = $words->toArray();

        // First, extract simple meanings for all words
        $wordMeanings = [];
        foreach ($allWords as $wordData) {
            $wordObj = new SavedWord($wordData);
            $meaning = $this->extractSimpleMeaning($wordObj);
            if ($meaning) {
                $wordMeanings[$wordData['id']] = $meaning;
            }
        }

        // Generate additional options to use as distractors
        $additionalOptions = $this->generateExtraOptions(count($allWords) * 4);

        foreach ($words as $word) {
            // Get the simple meaning for this word
            $correctMeaning = $wordMeanings[$word->id] ?? $this->fallbackMeaning($word);

            // Get 3 distinct incorrect meanings
            $incorrectMeanings = $this->getDistinctOptions(
                $wordMeanings,
                $additionalOptions,
                $correctMeaning,
                $word->id,
                3
            );

            // Create the options array with the correct answer at a random position
            $options = $incorrectMeanings;
            $correctIndex = rand(0, 3); // Random position for the correct answer
            array_splice($options, $correctIndex, 0, [$correctMeaning]); // Insert at random position

            $questions[] = [
                'question' => "What does '{$word->word}' mean?",
                'options' => $options,
                'correctAnswer' => $correctIndex,
                'word_id' => $word->id,
            ];
        }

        return [
            'questions' => $questions
        ];
    }

    private function createFillBlankQuiz($words)
    {
        $questions = [];

        foreach ($words as $word) {
            // Create a simple sentence using the word
            $sentence = $this->generateFillBlankSentence($word);

            // Replace the word with a blank
            $blankSentence = str_replace($word->word, '_____', $sentence);

            $questions[] = [
                'sentence' => $blankSentence,
                'correctAnswer' => $word->word,
                'word_id' => $word->id
            ];
        }

        return [
            'questions' => $questions
        ];
    }

    private function createMatchingQuiz($words)
    {
        // For matching quizzes, we create two parallel arrays - words and definitions
        $wordsList = [];
        $definitionsList = [];
        $matches = [];

        foreach ($words as $word) {
            $wordsList[] = $word->word;
            $meaning = $this->extractSimpleMeaning($word);
            $definitionsList[] = $meaning;

            $matches[] = [
                'word' => $word->word,
                'definition' => $meaning,
                'word_id' => $word->id
            ];
        }

        // Shuffle the definitions to make the quiz challenging
        shuffle($definitionsList);

        return [
            'words' => $wordsList,
            'definitions' => $definitionsList,
            'matches' => $matches
        ];
    }

    /**
     * Extract a simple, concise meaning (1-3 words if possible)
     */
    private function extractSimpleMeaning($word)
    {
        if (empty($word->definition)) {
            return $this->fallbackMeaning($word);
        }

        $definition = $word->definition;

        // Look for a direct translation in quotes (common pattern in definitions)
        if (preg_match('/translates to [\'"]([^\'"].*?)[\'"]/', $definition, $matches)) {
            return $this->cleanAndTruncate($matches[1]);
        }

        if (preg_match('/means [\'"]([^\'"].*?)[\'"]/', $definition, $matches)) {
            return $this->cleanAndTruncate($matches[1]);
        }

        // Look for a translation after a dash or colon
        if (preg_match('/-\s*([^\.;,]+)/', $definition, $matches)) {
            return $this->cleanAndTruncate($matches[1]);
        }

        if (preg_match('/:\s*([^\.;,]+)/', $definition, $matches)) {
            return $this->cleanAndTruncate($matches[1]);
        }

        // For nouns, look for the pattern "der/die/das Word - meaning"
        if (preg_match('/(der|die|das)\s+' . preg_quote($word->word, '/') . '\s*[-:]\s*([^\.;,]+)/', $definition, $matches)) {
            return $this->cleanAndTruncate($matches[2]);
        }

        // Try to extract from "is a" or "refers to" patterns
        if (preg_match('/is an?\s+([^\.;,]+)/', $definition, $matches)) {
            return $this->cleanAndTruncate($matches[1]);
        }

        if (preg_match('/refers to an?\s+([^\.;,]+)/', $definition, $matches)) {
            return $this->cleanAndTruncate($matches[1]);
        }

        // Fallback to word type-based meanings
        return $this->fallbackMeaning($word);
    }

    /**
     * Clean and truncate a meaning to a concise form
     */
    private function cleanAndTruncate($text)
    {
        // Remove articles at the beginning
        $text = preg_replace('/^(a|an|the)\s+/i', '', trim($text));

        // Limit to 3 words maximum
        $words = explode(' ', $text);
        if (count($words) > 3) {
            $text = implode(' ', array_slice($words, 0, 3));
        }

        return trim($text);
    }

    /**
     * Generate a fallback meaning based on word type
     */
    private function fallbackMeaning($word)
    {
        $wordType = $this->detectWordType($word);

        switch ($wordType) {
            case 'noun':
                return $this->generateRandomNoun();
            case 'verb':
                return $this->generateRandomVerb();
            case 'adjective':
                return $this->generateRandomAdjective();
            default:
                // Try to make something plausible from the word itself
                if (strlen($word->word) > 5) {
                    return strtolower(substr($word->word, 0, 5) . '...');
                }
                return "word";
        }
    }

    /**
     * Get distinct options for multiple choice questions
     */
    private function getDistinctOptions($wordMeanings, $additionalOptions, $correctMeaning, $currentWordId, $count)
    {
        // First try to get options from other word meanings
        $options = [];

        foreach ($wordMeanings as $wordId => $meaning) {
            if ($wordId !== $currentWordId && $meaning !== $correctMeaning && !in_array($meaning, $options)) {
                $options[] = $meaning;
                if (count($options) >= $count) {
                    break;
                }
            }
        }

        // If we don't have enough, add from additional options
        if (count($options) < $count) {
            $neededCount = $count - count($options);
            $shuffledAdditional = $additionalOptions;
            shuffle($shuffledAdditional);

            foreach ($shuffledAdditional as $option) {
                if ($option !== $correctMeaning && !in_array($option, $options)) {
                    $options[] = $option;
                    if (count($options) >= $count) {
                        break;
                    }
                }
            }
        }

        // If still not enough, add random words
        while (count($options) < $count) {
            $randomOption = $this->generateRandomWord();
            if ($randomOption !== $correctMeaning && !in_array($randomOption, $options)) {
                $options[] = $randomOption;
            }
        }

        return $options;
    }

    /**
     * Generate a list of potential options to use across quizzes
     */
    private function generateExtraOptions($count)
    {
        $options = [];
        $categories = ['nouns', 'verbs', 'adjectives', 'phrases', 'time', 'places', 'feelings'];

        // Generate a diverse set of options
        for ($i = 0; $i < $count; $i++) {
            $category = $categories[array_rand($categories)];

            switch ($category) {
                case 'nouns':
                    $options[] = $this->generateRandomNoun();
                    break;
                case 'verbs':
                    $options[] = $this->generateRandomVerb();
                    break;
                case 'adjectives':
                    $options[] = $this->generateRandomAdjective();
                    break;
                case 'phrases':
                    $options[] = $this->generateRandomPhrase();
                    break;
                case 'time':
                    $options[] = $this->generateTimeExpression();
                    break;
                case 'places':
                    $options[] = $this->generatePlaceWord();
                    break;
                case 'feelings':
                    $options[] = $this->generateFeelingWord();
                    break;
            }
        }

        return array_unique($options);
    }

    private function generateFillBlankSentence($word)
    {
        // Extract whether it's a noun, verb, etc. from the definition if available
        $wordType = $this->detectWordType($word);

        // Template sentences for different word types
        $templates = [
            'noun' => [
                "Ich sehe ein(e) {word} auf dem Tisch.",
                "Das ist mein(e) {word}.",
                "Die {word} ist sehr interessant.",
                "Wir brauchen eine neue {word}.",
                "Heute habe ich eine {word} gekauft."
            ],
            'verb' => [
                "Ich {word} jeden Tag.",
                "Wir {word} am Wochenende.",
                "Er kann gut {word}.",
                "Sie möchte heute {word}.",
                "Willst du {word}?"
            ],
            'adjective' => [
                "Das Haus ist sehr {word}.",
                "Er hat ein {word}es Auto.",
                "Die {word}e Frau ist meine Lehrerin.",
                "Mir gefällt deine {word}e Jacke.",
                "Das war wirklich {word}."
            ],
            'default' => [
                "Ich mag das Wort '{word}'.",
                "Kennst du das Wort '{word}'?",
                "'{word}' ist ein deutsches Wort.",
                "Kannst du '{word}' buchstabieren?",
                "Wie spricht man '{word}' aus?"
            ]
        ];

        // Select the appropriate template set
        $templateSet = $templates[$wordType] ?? $templates['default'];

        // Choose a random template and replace {word} with the actual word
        $template = $templateSet[array_rand($templateSet)];

        return str_replace('{word}', $word->word, $template);
    }

    private function detectWordType($word)
    {
        if (empty($word->definition)) {
            return 'default';
        }

        $definition = strtolower($word->definition);

        // Check definition for indicators
        if (strpos($definition, 'noun') !== false ||
            strpos($definition, 'der ') === 0 ||
            strpos($definition, 'die ') === 0 ||
            strpos($definition, 'das ') === 0) {
            return 'noun';
        }

        if (strpos($definition, 'verb') !== false ||
            strpos($definition, 'to ') !== false) {
            return 'verb';
        }

        if (strpos($definition, 'adjective') !== false) {
            return 'adjective';
        }

        // Try to guess from the word itself (less reliable)
        if (preg_match('/^[A-ZÄÖÜ]/', $word->word)) {
            // German nouns start with capital letters
            return 'noun';
        }

        if (substr($word->word, -2) === 'en' || substr($word->word, -3) === 'ern') {
            // Many German verbs end with 'en' or 'ern'
            return 'verb';
        }

        return 'default';
    }

    // Helper methods to generate random words or expressions
    private function generateRandomNoun()
    {
        $nouns = [
            "house", "car", "book", "dog", "cat", "table", "chair", "computer",
            "phone", "window", "door", "street", "city", "country", "person",
            "family", "friend", "school", "university", "job", "work", "food",
            "water", "coffee", "tea", "day", "week", "month", "year", "language"
        ];
        return $nouns[array_rand($nouns)];
    }

    private function generateRandomVerb()
    {
        $verbs = [
            "eat", "drink", "sleep", "work", "study", "read", "write", "speak",
            "listen", "walk", "run", "drive", "swim", "play", "watch", "see",
            "hear", "feel", "think", "know", "understand", "learn", "teach",
            "help", "like", "love", "hate", "find", "lose", "buy", "sell"
        ];
        return $verbs[array_rand($verbs)];
    }

    private function generateRandomAdjective()
    {
        $adjectives = [
            "big", "small", "tall", "short", "heavy", "light", "fast", "slow",
            "hot", "cold", "warm", "cool", "new", "old", "young", "beautiful",
            "ugly", "good", "bad", "happy", "sad", "angry", "friendly", "kind",
            "mean", "rich", "poor", "strong", "weak", "hard", "soft", "loud", "quiet"
        ];
        return $adjectives[array_rand($adjectives)];
    }

    private function generateRandomPhrase()
    {
        $phrases = [
            "thank you", "good morning", "good night", "see you later",
            "how are you", "very well", "excuse me", "I'm sorry",
            "of course", "no problem", "good luck", "cheers"
        ];
        return $phrases[array_rand($phrases)];
    }

    private function generateTimeExpression()
    {
        $times = [
            "morning", "afternoon", "evening", "night", "today",
            "tomorrow", "yesterday", "weekend", "holiday", "birthday",
            "soon", "later", "now", "never", "always"
        ];
        return $times[array_rand($times)];
    }

    private function generatePlaceWord()
    {
        $places = [
            "home", "store", "school", "office", "restaurant",
            "park", "beach", "mountain", "city", "village",
            "street", "room", "building", "garden", "forest"
        ];
        return $places[array_rand($places)];
    }

    private function generateFeelingWord()
    {
        $feelings = [
            "happy", "sad", "angry", "tired", "hungry",
            "thirsty", "excited", "bored", "scared", "surprised",
            "lonely", "proud", "embarrassed", "jealous", "grateful"
        ];
        return $feelings[array_rand($feelings)];
    }

    private function generateRandomWord()
    {
        $generators = [
            [$this, 'generateRandomNoun'],
            [$this, 'generateRandomVerb'],
            [$this, 'generateRandomAdjective'],
            [$this, 'generateTimeExpression'],
            [$this, 'generatePlaceWord'],
            [$this, 'generateFeelingWord']
        ];

        $generator = $generators[array_rand($generators)];
        return call_user_func($generator);
    }

    public function show(Quiz $quiz)
    {
        $this->authorize('view', $quiz);

        return response()->json($quiz);
    }

    public function update(Request $request, Quiz $quiz)
    {
        $this->authorize('update', $quiz);

        $request->validate([
            'title' => 'required|string|max:100',
        ]);

        $quiz->update($request->only(['title']));

        return response()->json([
            'message' => 'Quiz updated successfully',
            'quiz' => $quiz,
        ]);
    }

    public function destroy(Quiz $quiz)
    {
        $this->authorize('delete', $quiz);

        $quiz->delete();

        return response()->json([
            'message' => 'Quiz deleted successfully',
        ]);
    }

    public function submitAttempt(Request $request, Quiz $quiz)
    {
        $this->authorize('view', $quiz);

        $request->validate([
            'answers' => 'required|array',
        ]);

        $questions = $quiz->questions;
        $userAnswers = $request->answers;
        $score = 0;
        $totalQuestions = 0;

        if ($quiz->type === 'multiple_choice' || $quiz->type === 'fill_blank') {
            $questionsList = isset($questions['questions']) ? $questions['questions'] : $questions;
            $totalQuestions = count($questionsList);

            foreach ($userAnswers as $index => $answer) {
                if (isset($questionsList[$index]) &&
                    isset($questionsList[$index]['correctAnswer']) &&
                    strcasecmp($questionsList[$index]['correctAnswer'], $answer) === 0) {
                    $score++;
                }
            }
        } elseif ($quiz->type === 'matching') {
            if (isset($questions['words'])) {
                $totalQuestions = count($questions['words']);

                foreach ($userAnswers as $wordIndex => $definitionIndex) {
                    if (is_numeric($wordIndex) && is_numeric($definitionIndex) &&
                        isset($questions['matches'][$wordIndex]) &&
                        isset($questions['definitions'][$definitionIndex]) &&
                        $questions['matches'][$wordIndex]['definition'] === $questions['definitions'][$definitionIndex]) {
                        $score++;
                    }
                }
            } elseif (isset($questions['questions'])) {
                $totalQuestions = count($questions['questions']);

                foreach ($userAnswers as $index => $answer) {
                    if (isset($questions['questions'][$index]) &&
                        isset($questions['questions'][$index]['correctAnswer']) &&
                        strcasecmp($questions['questions'][$index]['correctAnswer'], $answer) === 0) {
                        $score++;
                    }
                }
            }
        }

        $quizAttempt = QuizAttempt::create([
            'user_id' => $request->user()->id,
            'quiz_id' => $quiz->id,
            'answers' => $userAnswers,
            'score' => $score,
        ]);

        return response()->json([
            'message' => 'Quiz attempt submitted successfully',
            'quizAttempt' => $quizAttempt,
            'score' => $score,
            'totalQuestions' => $totalQuestions,
        ]);
    }

    public function attempts(Quiz $quiz)
    {
        $this->authorize('view', $quiz);

        $attempts = $quiz->attempts()
            ->where('user_id', auth()->id())
            ->latest()
            ->get();

        return response()->json($attempts);
    }
}
