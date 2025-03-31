<?php

namespace App\Http\Controllers;

use App\Models\SavedWord;
use App\Services\OpenAIService;
use Illuminate\Http\Request;

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

        // Generate definition using OpenAI
        $definitionResult = $this->openaiService->generateWordDefinition(
            $request->word,
            $request->context
        );

        $definition = $definitionResult['success']
            ? $definitionResult['definition']
            : null;

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

        $definitionResult = $this->openaiService->generateWordDefinition(
            $savedWord->word,
            $savedWord->context
        );

        if (!$definitionResult['success']) {
            return response()->json([
                'message' => 'Failed to generate definition',
                'error' => $definitionResult['error']
            ], 500);
        }

        $savedWord->update([
            'definition' => $definitionResult['definition']
        ]);

        return response()->json([
            'message' => 'Definition regenerated successfully',
            'savedWord' => $savedWord,
        ]);
    }
}
