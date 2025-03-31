<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OpenAIService
{
    protected $openaiApiKey;
    protected $huggingfaceApiKey;
    protected $openaiBaseUrl = 'https://api.openai.com/v1';
    protected $useHuggingFace = false;

    public function __construct()
    {
        $this->openaiApiKey = config('services.openai.api_key');
        $this->huggingfaceApiKey = env('HUGGINGFACE_API_KEY');

        // If OpenAI key is missing or explicitly configured, use Hugging Face
        $this->useHuggingFace = empty($this->openaiApiKey) || env('USE_HUGGINGFACE', false);
    }

    public function generateParagraph($level, $topic = null)
    {
        $prompt = $this->buildPrompt($level, $topic);

        if ($this->useHuggingFace) {
            return $this->generateWithHuggingFace($prompt);
        } else {
            return $this->generateWithOpenAI($prompt, 'You are a German language teacher creating content for German language learners.');
        }
    }

    public function generateWordDefinition($word, $context = null)
    {
        $prompt = "Provide a clear and concise definition in English for the German word '$word'";
        if ($context) {
            $prompt .= " as used in this context: '$context'";
        }
        $prompt .= ". Also include the gender if it's a noun (der/die/das), the verb form if applicable, and example usage in a simple sentence.";

        if ($this->useHuggingFace) {
            return $this->generateWithHuggingFace($prompt);
        } else {
            return $this->generateWithOpenAI($prompt, 'You are a helpful German-English dictionary assistant.');
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

        if ($this->useHuggingFace) {
            $result = $this->generateWithHuggingFace($prompt);

            if ($result['success']) {
                // Try to extract and parse JSON from the response
                $jsonString = $result['content'];

                // Sometimes the model might add text before or after the JSON
                preg_match('/\{.*\}/s', $jsonString, $matches);

                if (!empty($matches[0])) {
                    $jsonString = $matches[0];
                }

                try {
                    $quizData = json_decode($jsonString, true);
                    if (json_last_error() === JSON_ERROR_NONE) {
                        return [
                            'success' => true,
                            'quiz' => $quizData,
                        ];
                    } else {
                        // Fallback to a simple quiz structure if parsing fails
                        return [
                            'success' => true,
                            'quiz' => $this->createFallbackQuiz($words, $type),
                        ];
                    }
                } catch (\Exception $e) {
                    return [
                        'success' => false,
                        'error' => 'Error processing quiz data: ' . $e->getMessage(),
                        'raw_content' => $jsonString,
                    ];
                }
            }
            return $result;
        } else {
            try {
                $response = Http::withHeaders([
                    'Authorization' => 'Bearer ' . $this->openaiApiKey,
                    'Content-Type' => 'application/json',
                ])->post($this->openaiBaseUrl . '/chat/completions', [
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
    }

    private function generateWithOpenAI($prompt, $systemPrompt)
    {
        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->openaiApiKey,
                'Content-Type' => 'application/json',
            ])->post($this->openaiBaseUrl . '/chat/completions', [
                'model' => 'gpt-3.5-turbo',
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => $systemPrompt
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

    private function generateWithHuggingFace($prompt)
    {
        // Choose a model with good German language capabilities
        $model = "mistralai/Mistral-7B-Instruct-v0.2"; // A good multilingual model

        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->huggingfaceApiKey,
                'Content-Type' => 'application/json',
            ])->post("https://api-inference.huggingface.co/models/{$model}", [
                'inputs' => $prompt,
                'parameters' => [
                    'max_new_tokens' => 250,
                    'temperature' => 0.7,
                    'return_full_text' => false,
                ]
            ]);

            if ($response->successful()) {
                $responseData = $response->json();

                // Hugging Face models can return different response formats
                if (is_array($responseData) && isset($responseData[0]) && isset($responseData[0]['generated_text'])) {
                    $generatedText = $responseData[0]['generated_text'];
                } else {
                    $generatedText = is_string($responseData) ? $responseData : json_encode($responseData);
                }

                // Clean up the response if it includes the prompt
                if (strpos($generatedText, $prompt) === 0) {
                    $generatedText = substr($generatedText, strlen($prompt));
                }

                return [
                    'success' => true,
                    'content' => trim($generatedText),
                ];
            } else {
                // If the model is loading or rate limited, provide a fallback response
                if ($response->status() === 503 || strpos($response->body(), 'loading') !== false) {
                    return [
                        'success' => true,
                        'content' => $this->generateFallbackResponse($prompt),
                    ];
                }

                Log::error('Hugging Face API Error', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                return [
                    'success' => false,
                    'error' => 'Failed to generate content: ' . $response->body(),
                ];
            }
        } catch (\Exception $e) {
            Log::error('Hugging Face Service Exception', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return [
                'success' => false,
                'error' => 'Service error: ' . $e->getMessage(),
            ];
        }
    }

    private function generateFallbackResponse($prompt)
    {
        // Extract level if this is a paragraph generation request
        $level = 'B1';
        if (preg_match('/at (A2|B1|B2|C1) level/', $prompt, $matches)) {
            $level = $matches[1];
        }

        // Extract topic if available
        $topic = 'Alltag';
        if (preg_match('/about \'(.+?)\'/', $prompt, $matches)) {
            $topic = $matches[1];
        }

        // Check if this is a paragraph generation request
        if (strpos($prompt, 'Generate a German paragraph') !== false) {
            return $this->getFallbackParagraph($level, $topic);
        }

        // Check if this is a word definition request
        if (preg_match('/definition for the German word \'(.+?)\'/', $prompt, $matches)) {
            $word = $matches[1];
            return $this->getFallbackDefinition($word);
        }

        // Default fallback response
        return "Es tut mir leid, ich konnte keine Antwort generieren. Bitte versuchen Sie es später noch einmal.";
    }

    private function getFallbackParagraph($level, $topic)
    {
        $paragraphs = [
            'A2' => [
                'Alltag' => "Im Alltag stehe ich um 7 Uhr auf. Ich frühstücke und trinke Kaffee. Dann gehe ich zur Arbeit. Ich arbeite von 9 bis 17 Uhr. Nach der Arbeit kaufe ich im Supermarkt ein. Zu Hause koche ich Abendessen. Ich sehe fern oder lese ein Buch. Um 23 Uhr gehe ich ins Bett. Am Wochenende schlafe ich länger. Ich treffe Freunde oder mache Sport. Manchmal gehe ich ins Kino oder ins Restaurant.",
                'Reisen' => "Ich reise gerne. Letzten Sommer war ich in Berlin. Berlin ist die Hauptstadt von Deutschland. Ich bin mit dem Zug gefahren. Die Reise hat fünf Stunden gedauert. In Berlin habe ich viele Sehenswürdigkeiten besucht. Das Brandenburger Tor war sehr schön. Ich habe auch das Berliner Museum besucht. Das Essen in Berlin war lecker. Ich habe in einem kleinen Hotel gewohnt. Das Wetter war gut, es war warm und sonnig.",
                'Familie' => "Meine Familie ist nicht sehr groß. Ich habe einen Bruder und eine Schwester. Mein Bruder heißt Thomas. Er ist 25 Jahre alt. Meine Schwester heißt Anna. Sie ist 20 Jahre alt. Meine Eltern leben in München. Mein Vater arbeitet als Lehrer. Meine Mutter ist Ärztin. Wir besuchen unsere Großeltern oft. Sie wohnen auf dem Land. Dort haben sie einen Garten und einen Hund."
            ],
            'B1' => [
                'Alltag' => "Mein Alltag ist ziemlich strukturiert. Normalerweise stehe ich um halb sieben auf und bereite mir einen starken Kaffee zu. Nach einer schnellen Dusche frühstücke ich meistens Müsli mit Joghurt und frischem Obst. An Wochentagen fahre ich mit der U-Bahn zur Arbeit, was etwa 30 Minuten dauert. In meiner Mittagspause gehe ich oft mit Kollegen in ein nahegelegenes Café oder esse mein mitgebrachtes Essen im Park, wenn das Wetter gut ist. Nach der Arbeit besuche ich manchmal ein Fitnessstudio oder treffe Freunde auf einen Drink. Die Abende verbringe ich gerne mit Kochen, Lesen oder Serien schauen.",
                'Reisen' => "Das Reisen gehört zu meinen größten Leidenschaften. Letztes Jahr habe ich eine wunderbare Reise nach Süddeutschland unternommen. Besonders beeindruckend fand ich die bayrischen Alpen mit ihren malerischen Dörfern und kristallklaren Seen. In München habe ich die lokale Kultur kennengelernt und natürlich auch die berühmten Biergärten besucht. Was mich an Deutschland fasziniert, ist die Mischung aus reicher Geschichte und moderner Lebensweise. Die Deutschen sind sehr umweltbewusst, was man an den vielen Fahrradwegen und dem gut ausgebauten öffentlichen Verkehrsnetz erkennen kann. Bei meiner nächsten Reise möchte ich den Schwarzwald erkunden.",
                'Familie' => "Meine Familie spielt eine zentrale Rolle in meinem Leben. Obwohl wir nicht alle in derselben Stadt wohnen, halten wir engen Kontakt. Meine Eltern leben noch in der Stadt, in der ich aufgewachsen bin, während mein älterer Bruder für seinen Job nach Berlin gezogen ist. Er arbeitet als Ingenieur bei einem großen Technologieunternehmen. Meine jüngere Schwester studiert Medizin in Heidelberg und möchte später als Kinderärztin arbeiten. An Feiertagen kommen wir alle zusammen und genießen die gemeinsame Zeit. Wir kochen traditionelle Familienrezepte, spielen Gesellschaftsspiele und tauschen Neuigkeiten aus. Diese Familientreffen sind mir besonders wichtig."
            ],
            'B2' => [
                'Alltag' => "Mein Alltag hat sich in den letzten Jahren stark verändert, seit ich angefangen habe, im Homeoffice zu arbeiten. Der Wegfall des Pendelns gibt mir mehr Zeit für mich selbst, was ich sehr zu schätzen weiß. Morgens beginne ich den Tag mit einer kurzen Meditation, gefolgt von einem ausgewogenen Frühstück. Da ich die klare Trennung zwischen Arbeit und Freizeit wichtig finde, habe ich mir ein separates Arbeitszimmer eingerichtet. In meinen Pausen gehe ich oft eine Runde um den Block oder erledige kleinere Haushaltsaufgaben, um den Kopf freizubekommen. Nach Feierabend nutze ich die gewonnene Zeit, um meinen Hobbys nachzugehen oder mich mit Freunden zu treffen. Die flexible Zeiteinteilung ermöglicht es mir außerdem, zweimal pro Woche einen Sprachkurs zu besuchen, was früher kaum möglich war.",
                'Reisen' => "Das Reisen eröffnet uns nicht nur neue Horizonte, sondern verändert auch unsere Perspektive auf die eigene Heimat. Bei meiner letzten Reise durch Deutschland habe ich bewusst auf die typischen Touristenpfade verzichtet und stattdessen kleinere Städte und Dörfer erkundet. Besonders beeindruckt hat mich die Region rund um den Bodensee, wo die Grenzen zu Österreich und der Schweiz fließend sind. Die kulturellen Unterschiede sind subtil, aber dennoch spürbar – sei es in der Architektur, der Küche oder den lokalen Dialekten. Was mich an solchen Reisen fasziniert, ist die Möglichkeit, mit Einheimischen ins Gespräch zu kommen und authentische Einblicke in deren Alltag zu gewinnen. Diese Begegnungen sind oft wertvoller als der Besuch bekannter Sehenswürdigkeiten und hinterlassen bleibende Eindrücke.",
                'Familie' => "Der Begriff 'Familie' hat in unserer modernen Gesellschaft eine vielfältigere Bedeutung angenommen als noch vor einigen Jahrzehnten. In meinem Fall besteht meine Familie aus einem komplexen Netzwerk von Blutsverwandten und Wahlverwandten. Nach der Scheidung meiner Eltern vor 15 Jahren haben beide neue Partner gefunden, wodurch ich nicht nur Stiefgeschwister, sondern auch deren Familien kennengelernt habe. Anfangs war es herausfordernd, diese neuen Beziehungen zu navigieren, doch mittlerweile empfinde ich die Vielfalt als Bereicherung. Besonders zu meiner Stiefschwester habe ich ein enges Verhältnis aufgebaut, obwohl wir charakterlich sehr unterschiedlich sind. Bei Familienfeiern kommen heute Menschen mit verschiedensten Hintergründen und Lebensgeschichten zusammen, was die Gespräche unglaublich interessant macht."
            ],
            'C1' => [
                'Alltag' => "Die Strukturierung des Alltags in einer zunehmend entgrenzten Arbeitswelt stellt viele von uns vor erhebliche Herausforderungen. Seit der Pandemie verschwimmen die Grenzen zwischen Berufs- und Privatleben zusehends, was einerseits Flexibilität ermöglicht, andererseits aber auch die Gefahr der ständigen Erreichbarkeit birgt. In meinem Fall habe ich daher bewusst Rituale etabliert, die mir helfen, diese Bereiche voneinander abzugrenzen. Der morgendliche Spaziergang zum Beispiel simuliert gewissermaßen den früheren Arbeitsweg und ermöglicht mir einen mentalen Übergang in den Arbeitsmodus. Ähnlich verhält es sich mit dem abendlichen Abschalten des Computers zu einer festgelegten Zeit, was das Ende des Arbeitstages markiert. Diese selbst auferlegten Grenzen mögen auf den ersten Blick künstlich erscheinen, erweisen sich jedoch als unerlässlich für die psychische Gesundheit in einer Welt, in der die traditionellen Arbeitsstrukturen zunehmend an Bedeutung verlieren.",
                'Reisen' => "Das Reisen im 21. Jahrhundert hat sich grundlegend gewandelt und wirft zunehmend Fragen nach seiner Nachhaltigkeit und ethischen Vertretbarkeit auf. Einerseits ermöglicht die globale Vernetzung interkulturelle Begegnungen und fördert das Verständnis für fremde Lebensweisen, andererseits hinterlässt jede Reise ökologische Fußabdrücke, die nicht ignoriert werden können. Bei meiner letzten Deutschlandreise habe ich bewusst auf Inlandsflüge verzichtet und stattdessen das gut ausgebaute Schienennetz genutzt, was zwar mehr Zeit in Anspruch nahm, mir aber auch tiefere Einblicke in die wechselnden Landschaften ermöglichte. Zudem habe ich vermehrt auf Unterkünfte gesetzt, die nachhaltige Konzepte verfolgen – von der Energieversorgung bis zur regionalen Küche. Die Frage, die sich mir dennoch stellt, ist, inwieweit individuelles Handeln ausreicht, wenn strukturelle Veränderungen auf politischer und wirtschaftlicher Ebene ausbleiben. Nichtsdestotrotz bin ich überzeugt, dass bewusstes Reisen einen Beitrag leisten kann, sofern es von einer kritischen Reflexion des eigenen Konsumverhaltens begleitet wird.",
                'Familie' => "Der Familienbegriff unterliegt einem tiefgreifenden Wandel, der eng mit gesellschaftlichen Entwicklungen verknüpft ist. Die traditionelle Kernfamilie, bestehend aus Eltern und Kindern, wird zunehmend durch vielfältigere Konstellationen ergänzt oder ersetzt – seien es Patchwork-Familien, Alleinerziehende, gleichgeschlechtliche Paare mit Kindern oder bewusst gewählte Gemeinschaften ohne biologische Verwandtschaft. Diese Diversifizierung spiegelt einerseits eine größere gesellschaftliche Akzeptanz verschiedener Lebensentwürfe wider, stößt andererseits aber auch auf Widerstände bei denjenigen, die an konventionellen Familienbildern festhalten. In meinem persönlichen Umfeld erlebe ich diesen Wandel als Bereicherung, da er die Möglichkeit bietet, Beziehungen jenseits vorgegebener Muster zu gestalten und zu leben. Gleichzeitig beobachte ich, dass familiäre Bindungen – unabhängig von ihrer Form – nach wie vor eine zentrale Rolle für das individuelle Wohlbefinden spielen. Sie bieten emotionalen Rückhalt in einer zunehmend fragmentierten Welt und vermitteln ein Gefühl der Zugehörigkeit, das in anderen sozialen Kontexten oft schwerer zu finden ist."
            ]
        ];

        if (isset($paragraphs[$level][$topic])) {
            return $paragraphs[$level][$topic];
        } else {
            // Return a paragraph for the requested level with a default topic
            $defaultTopic = array_key_first($paragraphs[$level]);
            return $paragraphs[$level][$defaultTopic];
        }
    }

    private function getFallbackDefinition($word)
    {
        $definitions = [
            'Haus' => "das Haus (plural: Häuser) - house, building. A structure for human habitation or use. Example: \"Das Haus ist groß.\" (The house is big.)",
            'gehen' => "gehen (verb) - to go, to walk. Example: \"Ich gehe zur Schule.\" (I go to school.)",
            'Buch' => "das Buch (plural: Bücher) - book. A written or printed work consisting of pages. Example: \"Ich lese ein interessantes Buch.\" (I am reading an interesting book.)",
            'schön' => "schön (adjective) - beautiful, nice, pleasant. Example: \"Das ist ein schönes Bild.\" (That is a beautiful picture.)",
            'Freund' => "der Freund (feminine: die Freundin, plural: die Freunde) - friend. A person with whom one has a bond of mutual affection. Example: \"Er ist mein bester Freund.\" (He is my best friend.)",
            'trinken' => "trinken (verb) - to drink. To take liquid into the mouth and swallow. Example: \"Ich trinke Wasser.\" (I drink water.)",
            'Zeit' => "die Zeit (plural: die Zeiten) - time. The indefinite continued progress of existence and events. Example: \"Ich habe keine Zeit.\" (I don't have time.)",
        ];

        if (isset($definitions[$word])) {
            return $definitions[$word];
        } else {
            return "Definition not available for this word. This is a fallback response.";
        }
    }

    private function createFallbackQuiz($words, $type)
    {
        $quiz = [];
        $questions = [];

        foreach ($words as $index => $wordData) {
            $word = $wordData['word'];

            switch ($type) {
                case 'multiple_choice':
                    $questions[] = [
                        'question' => "What does '$word' mean?",
                        'options' => [
                            'A' => 'Option A (correct translation would be here)',
                            'B' => 'Option B',
                            'C' => 'Option C',
                            'D' => 'Option D'
                        ],
                        'correctAnswer' => 'A'
                    ];
                    break;
                case 'fill_blank':
                    $questions[] = [
                        'sentence' => "_____ ist ein deutsches Wort.", // The word is a German word
                        'correctAnswer' => $word
                    ];
                    break;
                case 'matching':
                    // For matching, we'll just create a simple array of pairs
                    if ($index === 0) {
                        $questions = [
                            'words' => [],
                            'definitions' => [],
                            'matches' => []
                        ];
                    }

                    $questions['words'][] = $word;
                    $questions['definitions'][] = 'Definition for ' . $word;
                    $questions['matches'][] = [
                        'word' => $word,
                        'definition' => 'Definition for ' . $word
                    ];
                    break;
            }
        }

        // For matching type, we already structured the quiz above
        if ($type === 'matching') {
            return $questions;
        }

        // For other types, structure the quiz here
        $quiz = [
            'questions' => $questions,
            'type' => $type,
            'title' => 'German Vocabulary Quiz'
        ];

        return $quiz;
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
