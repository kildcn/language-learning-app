<?php

namespace App\Http\Controllers;

use App\Models\Paragraph;
use App\Services\OpenAIService;
use Illuminate\Http\Request;

class ParagraphController extends Controller
{
    protected $openaiService;

    public function __construct(OpenAIService $openaiService)
    {
        $this->openaiService = $openaiService;
    }

    public function index(Request $request)
    {
        $query = Paragraph::query();

        if ($request->has('level')) {
            $query->where('level', $request->level);
        }

        if ($request->has('topic')) {
            $query->where('topic', 'like', '%' . $request->topic . '%');
        }

        $paragraphs = $query->latest()->paginate(10);

        return response()->json($paragraphs);
    }

    public function store(Request $request)
    {
        $request->validate([
            'level' => 'required|in:A2,B1,B2,C1',
            'topic' => 'nullable|string|max:100',
        ]);

        $result = $this->openaiService->generateParagraph(
            $request->level,
            $request->topic
        );

        if (!$result['success']) {
            return response()->json([
                'message' => 'Failed to generate paragraph',
                'error' => $result['error']
            ], 500);
        }

        $paragraph = Paragraph::create([
            'content' => $result['content'],
            'level' => $request->level,
            'topic' => $request->topic,
            'title' => $request->topic ? $request->topic : null,
            'user_id' => $request->user()->id,
        ]);

        return response()->json([
            'message' => 'Paragraph generated successfully',
            'paragraph' => $paragraph,
        ], 201);
    }

    public function show(Paragraph $paragraph)
    {
        return response()->json($paragraph);
    }

    public function update(Request $request, Paragraph $paragraph)
    {
        $this->authorize('update', $paragraph);

        $request->validate([
            'title' => 'nullable|string|max:100',
            'content' => 'required|string',
        ]);

        $paragraph->update($request->only(['title', 'content']));

        return response()->json([
            'message' => 'Paragraph updated successfully',
            'paragraph' => $paragraph,
        ]);
    }

    public function destroy(Paragraph $paragraph)
    {
        $this->authorize('delete', $paragraph);

        $paragraph->delete();

        return response()->json([
            'message' => 'Paragraph deleted successfully',
        ]);
    }
}
