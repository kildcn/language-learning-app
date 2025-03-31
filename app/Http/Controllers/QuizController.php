<?php

namespace App\Http\Controllers;

use App\Models\Quiz;
use App\Models\QuizAttempt;
use App\Services\OpenAIService;
use Illuminate\Http\Request;

class QuizController extends Controller
{
    protected $openaiService;

    public function __construct(OpenAIService $openaiService)
    {
        $this->openaiService = $openaiService;
    }

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

        // Get the saved words to create a quiz
        $words = $request->user()
            ->savedWords()
            ->whereIn('id', $request->word_ids)
            ->get()
            ->toArray();

        if (count($words) == 0) {
            return response()->json([
                'message' => 'No words selected for the quiz',
            ], 400);
        }

        // Generate quiz using OpenAI
        $quizResult = $this->openaiService->generateQuiz(
            $words,
            $request->type
        );

        if (!$quizResult['success']) {
            return response()->json([
                'message' => 'Failed to generate quiz',
                'error' => $quizResult['error']
            ], 500);
        }

        $quiz = Quiz::create([
            'title' => $request->title,
            'type' => $request->type,
            'user_id' => $request->user()->id,
            'questions' => $quizResult['quiz'],
        ]);

        return response()->json([
            'message' => 'Quiz created successfully',
            'quiz' => $quiz,
        ], 201);
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

        // Calculate score based on quiz type and answers
        $questions = $quiz->questions;
        $userAnswers = $request->answers;
        $score = 0;
        $totalQuestions = count($questions);

        // Simple score calculation (can be improved based on quiz structure)
        foreach ($userAnswers as $index => $answer) {
            if (isset($questions[$index]) &&
                isset($questions[$index]['correctAnswer']) &&
                $questions[$index]['correctAnswer'] == $answer) {
                $score++;
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
