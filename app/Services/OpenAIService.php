<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OpenAIService
{
    protected $apiKey;
    protected $baseUrl = 'https://api.openai.com/v1';

    public function __construct()
    {
        $this->apiKey = config('services.openai.api_key');
    }

    public function generateParagraph($level, $topic = null)
    {
        $prompt = $this->buildPrompt($level, $topic);

        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->apiKey,
                'Content-Type' => 'application/json',
            ])->post($this->baseUrl . '/chat/completions', [
                'model' => 'gpt-3.5-turbo',
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => 'You are a German language teacher creating content for German language learners.'
                    ],
                    [
                        'role' => 'user',
                        'content' => $prompt
                    ]
                ],
                'temperature' => 0.7,
                'max_tokens' => 500,
            ]);

            if ($response->successful()) {
                $responseData = $response->json();
                return [
                    'success' => true,
                    'content' => $responseData['choices'][0]['message']['content'],
                ];
            } else {
                Log::error('OpenAI API Error', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                return [
                    'success' => false,
                    'error' => 'Failed to generate content: ' . $response->body(),
                ];
            }
        } catch (\Exception $e) {
            Log::error('OpenAI Service Exception', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return [
                'success' => false,
                'error' => 'Service error: ' . $e->getMessage(),
            ];
        }
    }

    public function generateWordDefinition($word, $context = null)
    {
        $prompt = "Provide a clear and concise definition in English for the German word '$word'";
        if ($context) {
            $prompt .= " as used in this context: '$context'";
        }
        $prompt .= ". Also include the gender if it's a noun (der/die/das), the verb form if applicable, and example usage in a simple sentence.";

        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->apiKey,
                'Content-Type' => 'application/json',
            ])->post($this->baseUrl . '/chat/completions', [
                'model' => 'gpt-3.5-turbo',
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => 'You are a helpful German-English dictionary assistant.'
                    ],
                    [
                        'role' => 'user',
                        'content' => $prompt
                    ]
                ],
                'temperature' => 0.3,
                'max_tokens' => 150,
            ]);

            if ($response->successful()) {
                $responseData = $response->json();
                return [
                    'success' => true,
                    'definition' => $responseData['choices'][0]['message']['content'],
                ];
            } else {
                Log::error('OpenAI API Error', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                return [
                    'success' => false,
                    'error' => 'Failed to generate definition: ' . $response->body(),
                ];
            }
        } catch (\Exception $e) {
            Log::error('OpenAI Service Exception', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return [
                'success' => false,
                'error' => 'Service error: ' . $e->getMessage(),
            ];
        }
    }

    public function generateQuiz($words, $type = 'multiple_choice')
    {
        $wordsList = implode(', ', array_map(function ($word) {
            return $word['word'];
        }, $words));

        $prompt = "Create a German " . ucfirst($type) . " quiz for the following words: $wordsList. ";

        switch ($type) {
            case 'multiple_choice':
                $prompt .= "For each word, provide a question about its meaning in English, 4 options (A, B, C, D), and the correct answer.";
                break;
            case 'fill_blank':
                $prompt .= "For each word, create a German sentence with a blank where the word should go, and the correct answer.";
                break;
            case 'matching':
                $prompt .= "Create a list of German words and a shuffled list of English definitions to match.";
                break;
        }

        $prompt .= " Format the response as JSON.";

        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->apiKey,
                'Content-Type' => 'application/json',
            ])->post($this->baseUrl . '/chat/completions', [
                'model' => 'gpt-3.5-turbo',
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => 'You are a German language teacher creating quizzes for German language learners. Always respond with valid JSON.'
                    ],
                    [
                        'role' => 'user',
                        'content' => $prompt
                    ]
                ],
                'temperature' => 0.7,
                'max_tokens' => 1000,
                'response_format' => ['type' => 'json_object'],
            ]);

            if ($response->successful()) {
                $responseData = $response->json();
                $quizContent = $responseData['choices'][0]['message']['content'];

                // Ensure the response is valid JSON
                $quizData = json_decode($quizContent, true);

                if (json_last_error() === JSON_ERROR_NONE) {
                    return [
                        'success' => true,
                        'quiz' => $quizData,
                    ];
                } else {
                    return [
                        'success' => false,
                        'error' => 'Failed to parse quiz data: ' . json_last_error_msg(),
                        'raw_content' => $quizContent,
                    ];
                }
            } else {
                Log::error('OpenAI API Error', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                return [
                    'success' => false,
                    'error' => 'Failed to generate quiz: ' . $response->body(),
                ];
            }
        } catch (\Exception $e) {
            Log::error('OpenAI Service Exception', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return [
                'success' => false,
                'error' => 'Service error: ' . $e->getMessage(),
            ];
        }
    }

    private function buildPrompt($level, $topic = null)
    {
        $levelDescription = $this->getLevelDescription($level);

        $prompt = "Generate a German paragraph for language learners at $level level ($levelDescription). ";

        if ($topic) {
            $prompt .= "The topic should be about '$topic'. ";
        }

        $prompt .= "The paragraph should:
        1. Be approximately 100-150 words
        2. Use vocabulary and grammar appropriate for $level level German
        3. Include a variety of sentence structures
        4. Be engaging and interesting to read
        5. Avoid using extremely rare or technical vocabulary unless necessary for the topic
        6. Be culturally relevant to German-speaking countries";

        return $prompt;
    }

    private function getLevelDescription($level)
    {
        $descriptions = [
            'A2' => 'basic/elementary level - can understand sentences and frequently used expressions related to areas of most immediate relevance in German',
            'B1' => 'intermediate level - can deal with most situations likely to arise while traveling in a German-speaking area',
            'B2' => 'upper intermediate level - can interact with a degree of fluency and spontaneity that makes regular interaction with native German speakers quite possible',
            'C1' => 'advanced level - can express ideas fluently and spontaneously in German without much obvious searching for expressions',
        ];

        return $descriptions[$level] ?? 'intermediate level';
    }
}
