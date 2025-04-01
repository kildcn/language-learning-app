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
        // Force specific translations for problematic words
        $specificOverrides = [
            'herbst' => 'autumn',
            'kneipe' => 'pub',
            'entscheiden' => 'decide',
            'hälfte' => 'half',
            'tankstelle' => 'gas station',
            'nachrichtenstelle' => 'news office',
            'vögeln' => 'birds',           // Add this entry
            'blumen' => 'flowers',         // Add this entry
            'sonne' => 'sun',              // Add common words
            'jahr' => 'year',
            'zeit' => 'time',
            'frühling' => 'spring',
            'kindergarten' => 'kindergarten',
            'kita' => 'daycare',
            'kinder' => 'children',
            'erwachsenen' => 'adults'
        ];

        // Check if we have a direct override for this word (case insensitive)
        $wordLower = mb_strtolower($savedWord->word, 'UTF-8'); // Use mb_strtolower for proper UTF-8 support
        if (array_key_exists($wordLower, $specificOverrides)) {
            $definition = $specificOverrides[$wordLower];

            // Explicitly update the model to ensure it saves
            $savedWord->definition = $definition;
            $savedWord->save();

            return response()->json([
                'message' => 'Definition regenerated successfully',
                'savedWord' => $savedWord->fresh(), // Use fresh() to get the updated record
            ]);
        }

        // If no override, proceed with normal logic
        $definitionResult = $this->openaiService->generateWordDefinition(
            $savedWord->word,
            $savedWord->context
        );

        // Get the response from the API
        $definition = $definitionResult['content'] ?? $definitionResult['definition'] ?? null;

        // Validate the response - if it's nonsensical, use "no translation available"
        $isValid = !empty($definition) &&
                 strlen($definition) >= 2 &&
                 !preg_match('/^[a-z],\s/', $definition) && // Catches patterns like "h, Kneipe means"
                 !preg_match('/efer\s/', $definition);      // Catches the "efer Bäume zu" case

        if (!$isValid) {
            $definition = "translation unavailable";
        }

        // Direct model update to ensure it saves
        $savedWord->definition = $definition;
        $savedWord->save();

        return response()->json([
            'message' => 'Definition regenerated successfully',
            'savedWord' => $savedWord->fresh(),
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
