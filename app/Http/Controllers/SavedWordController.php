<?php

namespace App\Http\Controllers;

use App\Models\SavedWord;
use App\Services\OpenAIService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SavedWordController extends Controller
{
    protected $openaiService;

    public function __construct(OpenAIService $openaiService)
    {
        $this->openaiService = $openaiService;
    }

    public function index(Request $request)
    {
        $savedWords = $request->user()
            ->savedWords()
            ->with('paragraph:id,content,level')
            ->latest()
            ->paginate(20);

        return response()->json($savedWords);
    }

    public function store(Request $request)
    {
        $request->validate([
            'word' => 'required|string|max:50',
            'context' => 'nullable|string',
            'paragraph_id' => 'nullable|exists:paragraphs,id',
        ]);

        // Check if the word is already saved by the user
        $existingWord = $request->user()
            ->savedWords()
            ->where('word', $request->word)
            ->first();

        if ($existingWord) {
            return response()->json([
                'message' => 'Word already saved',
                'savedWord' => $existingWord,
            ]);
        }

        // Generate definition using Hugging Face (via OpenAIService)
        try {
            $definitionResult = $this->openaiService->generateWordDefinition(
                $request->word,
                $request->context
            );

            // OpenAIService now always returns success=true
            // with fallback definitions when needed
            $definition = $definitionResult['content'] ?? $definitionResult['definition'] ?? null;

            if (!$definition) {
                $definition = "No definition available for this word.";
            }
        } catch (\Exception $e) {
            // Log the error but continue with a fallback definition
            Log::error('Definition generation failed: ' . $e->getMessage());
            $definition = "No definition available at this time.";
        }

        try {
            $savedWord = SavedWord::create([
                'word' => $request->word,
                'context' => $request->context,
                'definition' => $definition,
                'user_id' => $request->user()->id,
                'paragraph_id' => $request->paragraph_id,
            ]);

            return response()->json([
                'message' => 'Word saved successfully',
                'savedWord' => $savedWord,
            ], 201);
        } catch (\Exception $e) {
            Log::error('Error saving word: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to save word',
                'error' => 'Database error'
            ], 500);
        }
    }

    public function show(SavedWord $savedWord)
    {
        $this->authorize('view', $savedWord);

        return response()->json($savedWord);
    }

    public function update(Request $request, SavedWord $savedWord)
    {
        $this->authorize('update', $savedWord);

        $request->validate([
            'context' => 'nullable|string',
            'definition' => 'nullable|string',
        ]);

        $savedWord->update($request->only(['context', 'definition']));

        return response()->json([
            'message' => 'Saved word updated successfully',
            'savedWord' => $savedWord,
        ]);
    }

    public function destroy(SavedWord $savedWord)
    {
        $this->authorize('delete', $savedWord);

        $savedWord->delete();

        return response()->json([
            'message' => 'Saved word deleted successfully',
        ]);
    }

    public function regenerateDefinition(Request $request, SavedWord $savedWord)
    {
        $this->authorize('update', $savedWord);

        try {
            $definitionResult = $this->openaiService->generateWordDefinition(
                $savedWord->word,
                $savedWord->context
            );

            // Our modified service should always return success
            $definition = $definitionResult['content'] ?? $definitionResult['definition'] ?? null;

            if (!$definition) {
                $definition = "No definition available for this word.";
            }

            $savedWord->update([
                'definition' => $definition
            ]);

            return response()->json([
                'message' => 'Definition regenerated successfully',
                'savedWord' => $savedWord,
            ]);
        } catch (\Exception $e) {
            Log::error('Error regenerating definition: ' . $e->getMessage());

            return response()->json([
                'message' => 'Failed to regenerate definition',
                'error' => 'Service unavailable'
            ], 500);
        }
    }
}
