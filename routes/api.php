<?php
// routes/api.php
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\ParagraphController;
use App\Http\Controllers\QuizController;
use App\Http\Controllers\SavedWordController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);

    // Paragraphs
    Route::apiResource('paragraphs', ParagraphController::class);

    // Saved Words
    Route::apiResource('saved-words', SavedWordController::class);
    Route::post('/saved-words/{savedWord}/regenerate-definition', [SavedWordController::class, 'regenerateDefinition']);

    // Quizzes
    Route::apiResource('quizzes', QuizController::class);
    Route::post('/quizzes/{quiz}/attempt', [QuizController::class, 'submitAttempt']);
    Route::get('/quizzes/{quiz}/attempts', [QuizController::class, 'attempts']);
});
