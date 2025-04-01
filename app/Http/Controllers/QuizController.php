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

            $quizData = $this->createSimpleQuiz($words, $request->type);

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

    private function createSimpleQuiz($words, $type)
    {
        $quizData = [];

        if ($type === 'multiple_choice') {
            $questions = [];

            foreach ($words as $word) {
                $definition = $this->getDefinitionExcerpt($word);

                // Get distinct incorrect options
                $usedWordIds = collect([$word->id]);
                $incorrectOptions = [];

                while (count($incorrectOptions) < 3) {
                    $query = SavedWord::whereNotIn('id', $usedWordIds->toArray());

                    // Filter by part of speech if available
                    if (isset($word->part_of_speech)) {
                        $query->where('part_of_speech', $word->part_of_speech);
                    }

                    $randomWord = $query->inRandomOrder()->first();

                    if ($randomWord) {
                        $option = $this->getDefinitionExcerpt($randomWord);
                        if (!in_array($option, $incorrectOptions) && $option !== $definition) {
                            $incorrectOptions[] = $option;
                            $usedWordIds->push($randomWord->id);
                        }
                    } else {
                        break;
                    }
                }

                $options = array_merge($incorrectOptions, [$definition]);
                shuffle($options);
                $correctAnswer = array_search($definition, $options);

                $questions[] = [
                    'question' => "What does '{$word->word}' mean?",
                    'options' => $options,
                    'correctAnswer' => $correctAnswer,
                    'word_id' => $word->id,
                ];
            }

            $quizData['questions'] = $questions;
        } elseif ($type === 'fill_blank') {
            // ... (fill_blank logic remains the same)
        } elseif ($type === 'matching') {
            // ... (matching logic remains the same)
        }

        return $quizData;
    }

    private function getDefinitionExcerpt($word)
    {
        if (empty($word->definition)) {
            return "Definition for {$word->word}";
        }

        // Improve definition excerpting
        $cleanDefinition = preg_replace('/\([^)]+\)/', '', $word->definition);
        $parts = explode('.', $cleanDefinition);
        $firstPart = trim($parts[0]);

        if (strlen($firstPart) < 20 && isset($parts[1])) {
            $firstPart .= '. ' . trim($parts[1]);
        }

        if (strlen($firstPart) > 60) {
            $firstPart = substr($firstPart, 0, 57) . '...';
        }

        return $firstPart ?: "Definition for {$word->word}";
    }

    public function show(Quiz $quiz)
    {
        $this->authorize('view', $quiz);

        Log::info('Quiz data structure', [
            'id' => $quiz->id,
            'type' => $quiz->type,
            'questions' => $quiz->questions,
        ]);

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
