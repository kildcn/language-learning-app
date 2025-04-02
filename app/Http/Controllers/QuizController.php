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
            ->with(['attempts' => function($query) use ($request) {
                $query->where('user_id', $request->user()->id);
            }])
            ->latest()
            ->paginate(10);

        return response()->json($quizzes);
    }

    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:100',
            'type' => 'required|in:multiple_choice,matching',
            'word_ids' => 'sometimes|array',
            'word_ids.*' => 'exists:saved_words,id',
            'wordCount' => 'sometimes|integer|min:5|max:20',
            'level' => 'sometimes|in:all,beginner,intermediate,advanced',
            'source' => 'required|in:selection,recent,random',
        ]);

        try {
            // Get words based on the requested source
            $words = $this->getWordsForQuiz($request);

            if ($words->count() === 0) {
                return response()->json([
                    'message' => 'No words available for the quiz',
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

    /**
     * Get words for quiz based on source (selection, recent, random)
     */
    private function getWordsForQuiz(Request $request)
    {
        $userId = $request->user()->id;
        $query = SavedWord::where('user_id', $userId);

        // Filter by level if provided
        if ($request->has('level') && $request->level !== 'all') {
            $query->when($request->level === 'beginner', function($q) {
                return $q->whereRaw('LENGTH(word) <= 6');
            })
            ->when($request->level === 'intermediate', function($q) {
                return $q->whereRaw('LENGTH(word) > 6 AND LENGTH(word) <= 10');
            })
            ->when($request->level === 'advanced', function($q) {
                return $q->whereRaw('LENGTH(word) > 10');
            });
        }

        if ($request->source === 'selection' && $request->has('word_ids')) {
            // Selection: Use specific word IDs
            return $query->whereIn('id', $request->word_ids)->get();
        } elseif ($request->source === 'recent') {
            // Recent: Get most recently saved words
            $limit = $request->wordCount ?? 10;
            return $query->latest()->limit($limit)->get();
        } else {
            // Random: Get random words
            $limit = $request->wordCount ?? 10;
            return $query->inRandomOrder()->limit($limit)->get();
        }
    }

    private function createQuiz($words, $type)
    {
        if ($type === 'multiple_choice') {
            return $this->createMultipleChoiceQuiz($words);
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
            $correctMeaning = $wordMeanings[$word->id] ?? $this->extractSimpleMeaning($word);

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

        // Check for specific word categories first to improve classification
        $wordCategory = $this->detectWordCategory($definition);

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
        if ($wordCategory === 'noun' && preg_match('/(der|die|das)\s+' . preg_quote($word->word, '/') . '\s*[-:]\s*([^\.;,]+)/', $definition, $matches)) {
            return $this->cleanAndTruncate($matches[2]);
        }

        // Try to extract from "is a" or "refers to" patterns
        if (preg_match('/is an?\s+([^\.;,]+)/', $definition, $matches)) {
            return $this->cleanAndTruncate($matches[1]);
        }

        if (preg_match('/refers to an?\s+([^\.;,]+)/', $definition, $matches)) {
            return $this->cleanAndTruncate($matches[1]);
        }

        // If nothing matched, just take the first few words of the definition
        $parts = explode(' ', trim($definition));
        $simplifiedDefinition = implode(' ', array_slice($parts, 0, 3));

        return $simplifiedDefinition ?: $this->fallbackMeaning($word);
    }

    /**
     * Clean and truncate a meaning to a concise form
     */
    private function cleanAndTruncate($text)
    {
        // Remove articles at the beginning
        $text = preg_replace('/^(a|an|the)\s+/i', '', trim($text));

        // Remove any extra information in parentheses
        $text = preg_replace('/\([^)]*\)/', '', $text);

        // Limit to 3 words maximum
        $words = explode(' ', $text);
        if (count($words) > 3) {
            $text = implode(' ', array_slice($words, 0, 3));
        }

        return trim($text);
    }

    /**
     * Detect the category of the word (noun, verb, adjective, etc.)
     */
    private function detectWordCategory($definition)
    {
        $definition = strtolower($definition);

        if (strpos($definition, 'noun') !== false ||
            preg_match('/^(der|die|das)\s/', $definition) ||
            preg_match('/\bsubstantiv\b/', $definition)) {
            return 'noun';
        }

        if (strpos($definition, 'verb') !== false ||
            strpos($definition, 'to ') === 0 ||
            preg_match('/\bverb\b/', $definition) ||
            preg_match('/\baktion\b/', $definition)) {
            return 'verb';
        }

        if (strpos($definition, 'adjective') !== false ||
            preg_match('/\badjektiv\b/', $definition) ||
            preg_match('/\bdescribes\b/', $definition)) {
            return 'adjective';
        }

        if (strpos($definition, 'adverb') !== false ||
            preg_match('/\badverb\b/', $definition)) {
            return 'adverb';
        }

        // German nouns start with capital letters
        if (preg_match('/^[A-ZÄÖÜ]/', $definition)) {
            return 'noun';
        }

        return 'other';
    }

    /**
     * Generate a fallback meaning based on word type
     */
    private function fallbackMeaning($word)
    {
        $wordCategory = $this->detectWordCategory($word->definition);

        switch ($wordCategory) {
            case 'noun':
                return $this->generateRandomNoun();
            case 'verb':
                return $this->generateRandomVerb();
            case 'adjective':
                return $this->generateRandomAdjective();
            default:
                // If we can't detect the type, use the word itself
                if (!empty($word->definition)) {
                    // Try to extract the first word from the definition
                    $parts = explode(' ', trim($word->definition));
                    return $parts[0];
                }
                return $word->word;
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

        // Load attempts for the quiz
        $quiz->load(['attempts' => function($query) {
            $query->where('user_id', auth()->id())->latest();
        }]);

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

        if ($quiz->type === 'multiple_choice') {
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
            // For matching quizzes, user answers should contain wordIndex and definitionIndex
            if (isset($questions['words']) && isset($questions['matches'])) {
                $totalQuestions = count($questions['words']);
                $matches = $questions['matches'];

                // Convert matches to a lookup array for easier comparison
                $correctMatches = [];
                foreach ($matches as $index => $match) {
                    // Find the correct definition index based on the definition text
                    $correctDefIndex = array_search($match['definition'], $questions['definitions']);
                    if ($correctDefIndex !== false) {
                        $correctMatches[$index] = $correctDefIndex;
                    }
                }

                // Check each user answer
                foreach ($userAnswers as $answer) {
                    if (isset($answer['wordIndex']) && isset($answer['definitionIndex'])) {
                        $wordIndex = $answer['wordIndex'];
                        $defIndex = $answer['definitionIndex'];

                        // If this word's correct match is this definition, count as correct
                        if (isset($correctMatches[$wordIndex]) && $correctMatches[$wordIndex] === $defIndex) {
                            $score++;
                        }
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

    /**
     * Get stats for all user's quiz attempts
     */
    public function stats(Request $request)
    {
        $userId = $request->user()->id;

        // Get all attempts for this user
        $attempts = QuizAttempt::where('user_id', $userId)->get();

        $totalAttempts = $attempts->count();
        $totalScore = $attempts->sum('score');
        $totalQuestions = 0;

        foreach ($attempts as $attempt) {
            $quiz = Quiz::find($attempt->quiz_id);
            if ($quiz) {
                if ($quiz->type === 'multiple_choice') {
                    $questions = isset($quiz->questions['questions']) ? $quiz->questions['questions'] : $quiz->questions;
                    $totalQuestions += count($questions);
                } elseif ($quiz->type === 'matching') {
                    if (isset($quiz->questions['words'])) {
                        $totalQuestions += count($quiz->questions['words']);
                    } elseif (isset($quiz->questions['questions'])) {
                        $totalQuestions += count($quiz->questions['questions']);
                    }
                }
            }
        }

        $avgScore = $totalQuestions > 0 ? ($totalScore / $totalQuestions) * 100 : 0;

        return response()->json([
            'totalAttempts' => $totalAttempts,
            'avgScore' => round($avgScore, 1),
            'totalWords' => $totalScore,
            'totalQuestions' => $totalQuestions
        ]);
    }
}
