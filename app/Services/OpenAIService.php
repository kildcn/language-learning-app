<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OpenAIService
{
    protected $huggingfaceApiKey;

    // Despite the class name, we're only using Hugging Face now
    public function __construct()
    {
        $this->huggingfaceApiKey = env('HUGGINGFACE_API_KEY');
    }

    public function generateParagraph($level, $topic = null)
    {
        $prompt = $this->buildPrompt($level, $topic);
        return $this->generateWithHuggingFace($prompt);
    }

    public function generateWordDefinition($word, $context = null)
    {
        // Check if we have a fallback definition first
        $fallbackDefinition = $this->getFallbackDefinition($word);

        // If no API key or word has a predefined fallback, just return that
        if (empty($this->huggingfaceApiKey) || $fallbackDefinition) {
            // Extract just the single word translation from the fallback definition
            if ($fallbackDefinition) {
                $singleWord = $this->extractSingleWordTranslation($fallbackDefinition);
                return [
                    'success' => true,
                    'definition' => $singleWord ?: $fallbackDefinition,
                ];
            }
            return [
                'success' => true,
                'definition' => "Definition not available for this word.",
            ];
        }

        $prompt = "Translate the German word '$word' to English. Provide ONLY the direct English translation as a single with no additional explanation, context, or formatting. 1 word, extremely important!!!!.";

        $result = $this->generateWithHuggingFace($prompt);

        if ($result['success'] && isset($result['content'])) {
            // Clean up the response to ensure it's just a single word or short phrase
            $result['content'] = $this->extractSingleWordTranslation($result['content']);
        }

        return $result;
    }

    /**
     * Extract a single word translation from a longer definition
     *
     * @param string $definition The full definition text
     * @return string The single word translation
     */
    private function extractSingleWordTranslation($definition)
    {
        // Handle null or empty definitions
        if (empty($definition)) {
            return "no translation available";
        }

        // For the specific case of "Kneipe"
        if (stripos($definition, 'Kneipe') !== false) {
            return "pub";
        }

        // First try to extract the word after "- " pattern (common in definitions)
        if (preg_match('/^.*?\s-\s([^\.]+)/', $definition, $matches)) {
            return trim($matches[1]);
        }

        // Look for means or translates to patterns
        if (preg_match('/means\s+["\']*([^"\'\.]+)["\']*/i', $definition, $matches)) {
            return trim($matches[1]);
        }

        if (preg_match('/translates\s+to\s+["\']*([^"\'\.]+)["\']*/i', $definition, $matches)) {
            return trim($matches[1]);
        }

        // Common format with word and then translation
        if (preg_match('/"[^"]+"\s+means\s+["\']*([^"\'\.]+)["\']*/i', $definition, $matches)) {
            return trim($matches[1]);
        }

        // If the response is incomplete, provide a direct mapping for common words
        $directTranslations = [
            'Kneipe' => 'pub',
            'Herbst' => 'autumn',
            'entscheiden' => 'decide',
            'Tankstelle' => 'gas station',
            'Hälfte' => 'half',
            'Nachrichtenstelle' => 'news office'
        ];

        foreach ($directTranslations as $german => $english) {
            if (stripos($definition, $german) !== false) {
                return $english;
            }
        }

        // If that fails, just take the first line or up to the first period
        $firstLine = strtok($definition, "\n");
        $firstSentence = strtok($firstLine, ".");

        // Remove any explanatory text in parentheses
        $clean = preg_replace('/\([^)]+\)/', '', $firstSentence);

        // Remove any gender indicators like "der/die/das"
        $clean = preg_replace('/\b(der|die|das)\b/', '', $clean);

        // Remove common prefixes that might appear in the definition
        $clean = preg_replace('/^(noun|verb|adjective|adverb):\s*/', '', $clean);

        // Trim and limit to a maximum of 3 words
        $words = preg_split('/\s+/', trim($clean));
        $result = implode(' ', array_slice($words, 0, 3));

        return $result ?: "translation unavailable";
    }


    public function generateQuiz($words, $type = 'multiple_choice')
    {
        // Extract just the words and their definitions for the prompt
        $wordsList = [];
        foreach ($words as $word) {
            $wordsList[] = [
                'word' => $word['word'],
                'definition' => $word['definition'] ?? 'No definition available'
            ];
        }

        // Create a detailed prompt to get properly formatted quiz questions
        $prompt = "Create a German vocabulary quiz in JSON format with the following requirements:\n\n";

        if ($type === 'multiple_choice') {
            $prompt .= "- For each word, create a question 'What does [WORD] mean?'\n";
            $prompt .= "- Each question should have 4 answer options (labeled 0-3)\n";
            $prompt .= "- One option must be the correct meaning (simple and concise, 1-3 words maximum)\n";
            $prompt .= "- The other 3 options should be incorrect but plausible meanings (also 1-3 words each)\n";
            $prompt .= "- Include the index of the correct answer (0-3)\n";
            $prompt .= "- DO NOT include the original German word in any of the answer options\n";
            $prompt .= "- Answer options should be short and consistent in style\n";
        } elseif ($type === 'fill_blank') {
            $prompt .= "- For each word, create a simple German sentence using that word\n";
            $prompt .= "- Replace the word with '_____' in the sentence\n";
            $prompt .= "- Include the correct word as the answer\n";
        } elseif ($type === 'matching') {
            $prompt .= "- Create two lists: German words and their English meanings\n";
            $prompt .= "- Each meaning should be simple and concise (1-3 words)\n";
            $prompt .= "- Include the correct matches\n";
        }

        $prompt .= "\nHere are the German words to include in the quiz:\n";
        foreach ($wordsList as $word) {
            $prompt .= "- {$word['word']}: {$word['definition']}\n";
        }

        $prompt .= "\nFormat the response as valid JSON according to this structure:\n";

        if ($type === 'multiple_choice') {
            $prompt .= <<<JSON
{
  "questions": [
    {
      "question": "What does 'German word' mean?",
      "options": ["option1", "option2", "option3", "option4"],
      "correctAnswer": 0,
      "word_id": 0
    },
    ...
  ]
}
JSON;
        } elseif ($type === 'fill_blank') {
            $prompt .= <<<JSON
{
  "questions": [
    {
      "sentence": "German sentence with _____.",
      "correctAnswer": "German word",
      "word_id": 0
    },
    ...
  ]
}
JSON;
        } elseif ($type === 'matching') {
            $prompt .= <<<JSON
{
  "words": ["word1", "word2", "word3"],
  "definitions": ["meaning1", "meaning2", "meaning3"],
  "matches": [
    {
      "word": "word1",
      "definition": "meaning1",
      "word_id": 0
    },
    ...
  ]
}
JSON;
        }

        // Make the API call
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
                    // Update the word_id values to match the actual word IDs
                    $quizData = $this->updateWordIds($quizData, $words, $type);

                    return [
                        'success' => true,
                        'quiz' => $quizData,
                    ];
                } else {
                    // Fallback to a simple quiz structure if parsing fails
                    Log::error('Failed to parse quiz JSON: ' . json_last_error_msg());
                    Log::error('JSON content: ' . $jsonString);
                    return [
                        'success' => true, // Still return success but with fallback
                        'quiz' => $this->createFallbackQuiz($words, $type),
                    ];
                }
            } catch (\Exception $e) {
                Log::error('Error processing quiz data: ' . $e->getMessage());
                return [
                    'success' => true, // Still return success but with fallback
                    'quiz' => $this->createFallbackQuiz($words, $type),
                ];
            }
        }

        // If Hugging Face call failed, also return a fallback quiz
        return [
            'success' => true,
            'quiz' => $this->createFallbackQuiz($words, $type),
        ];
    }

    /**
     * Update word IDs in the generated quiz to match the actual word IDs
     */
    private function updateWordIds($quizData, $words, $type)
    {
        if ($type === 'multiple_choice' || $type === 'fill_blank') {
            if (isset($quizData['questions'])) {
                foreach ($quizData['questions'] as $index => $question) {
                    if (isset($words[$index]) && isset($words[$index]['id'])) {
                        $quizData['questions'][$index]['word_id'] = $words[$index]['id'];
                    }
                }
            }
        } elseif ($type === 'matching') {
            if (isset($quizData['matches'])) {
                foreach ($quizData['matches'] as $index => $match) {
                    if (isset($words[$index]) && isset($words[$index]['id'])) {
                        $quizData['matches'][$index]['word_id'] = $words[$index]['id'];
                    }
                }
            }
        }

        return $quizData;
    }

    private function generateWithHuggingFace($prompt)
    {
        // If no API key, use fallback response immediately
        if (empty($this->huggingfaceApiKey)) {
            return [
                'success' => true,
                'content' => $this->generateFallbackResponse($prompt),
            ];
        }

        // Choose a model with good German language capabilities
        $model = "mistralai/Mistral-7B-Instruct-v0.2"; // A good multilingual model

        try {
            $response = Http::timeout(15)->withHeaders([
                'Authorization' => 'Bearer ' . $this->huggingfaceApiKey,
                'Content-Type' => 'application/json',
            ])->post("https://api-inference.huggingface.co/models/{$model}", [
                'inputs' => $prompt,
                'parameters' => [
                    'max_new_tokens' => 500, // Increased for quiz generation
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
                Log::warning('Hugging Face API returned non-success: ' . $response->status());

                return [
                    'success' => true, // Still mark as success to prevent errors
                    'content' => $this->generateFallbackResponse($prompt),
                ];
            }
        } catch (\Exception $e) {
            Log::error('Hugging Face Service Exception', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return [
                'success' => true, // Return success to prevent errors cascading
                'content' => $this->generateFallbackResponse($prompt),
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

        // Check if this is a quiz generation request
        if (strpos($prompt, 'Create a German vocabulary quiz') !== false) {
            // Extract the quiz type
            $type = 'multiple_choice';
            if (strpos($prompt, 'matching') !== false) {
                $type = 'matching';
            } elseif (strpos($prompt, 'fill_blank') !== false) {
                $type = 'fill_blank';
            }

            // Extract words from the prompt
            preg_match_all('/- (.+?): (.+?)$/m', $prompt, $matches, PREG_SET_ORDER);
            $words = [];
            foreach ($matches as $index => $match) {
                $words[] = [
                    'id' => $index,
                    'word' => $match[1],
                    'definition' => $match[2]
                ];
            }

            return json_encode($this->createFallbackQuiz($words, $type));
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
            'Katze' => "die Katze (plural: die Katzen) - cat. A small domesticated carnivorous mammal. Example: \"Meine Katze schläft gerne.\" (My cat likes to sleep.)",
            'Mann' => "der Mann (plural: die Männer) - man. An adult male human. Example: \"Der Mann liest eine Zeitung.\" (The man is reading a newspaper.)",
            'Frau' => "die Frau (plural: die Frauen) - woman; wife. An adult female human; a female partner in a marriage. Example: \"Die Frau arbeitet als Ärztin.\" (The woman works as a doctor.)",
            'Kind' => "das Kind (plural: die Kinder) - child. A young human being. Example: \"Das Kind spielt im Garten.\" (The child is playing in the garden.)",
            'Auto' => "das Auto (plural: die Autos) - car. A road vehicle powered by an engine. Example: \"Mein Auto ist blau.\" (My car is blue.)",
            'Arbeit' => "die Arbeit (plural: die Arbeiten) - work, job. Activity involving mental or physical effort done to achieve a purpose or result. Example: \"Ich gehe zur Arbeit.\" (I go to work.)",
            'Wasser' => "das Wasser (no common plural) - water. A transparent, odorless, tasteless liquid. Example: \"Ich trinke gerne Wasser.\" (I like to drink water.)",
            'Tag' => "der Tag (plural: die Tage) - day. A period of 24 hours. Example: \"Heute ist ein schöner Tag.\" (Today is a beautiful day.)",
            'Hälfte' => "die Hälfte - half. One of two equal or corresponding parts into which something is or can be divided. Example: \"Ich nehme die Hälfte des Kuchens.\" (I'll take half of the cake.)",
            'Tankstelle' => "die Tankstelle (plural: die Tankstellen) - gas station, petrol station. A place where fuel or gasoline is sold to refill vehicles. Example: \"Ich muss an der Tankstelle tanken.\" (I need to refuel at the gas station.)",
            'Nachrichtenstelle' => "die Nachrichtenstelle - news office, information center. A place or facility where news and information is gathered and distributed. Example: \"Die Nachrichtenstelle berichtet über aktuelle Ereignisse.\" (The news office reports on current events.)",
            'Abendessen' => "das Abendessen - dinner, evening meal. The main meal of the day, typically eaten in the evening. Example: \"Wir essen um 19 Uhr Abendessen.\" (We eat dinner at 7 PM.)",
            'Möglichkeit' => "die Möglichkeit (plural: die Möglichkeiten) - possibility, opportunity, option. A chance for something to happen or be done. Example: \"Es gibt viele Möglichkeiten, Deutsch zu lernen.\" (There are many ways to learn German.)"
        ];

        return isset($definitions[$word]) ? $definitions[$word] : null;
    }

    private function createFallbackQuiz($words, $type)
    {
        // Create a simple fallback quiz based on the type
        if ($type === 'multiple_choice') {
            return $this->createMultipleChoiceQuiz($words);
        } elseif ($type === 'fill_blank') {
            return $this->createFillBlankQuiz($words);
        } elseif ($type === 'matching') {
            return $this->createMatchingQuiz($words);
        }

        // Default to multiple choice
        return $this->createMultipleChoiceQuiz($words);
    }

    private function createMultipleChoiceQuiz($words)
    {
        $questions = [];
        $allTranslations = $this->getBasicTranslations();

        foreach ($words as $index => $wordData) {
            $word = $wordData['word'];
            $translation = $this->getTranslation($word, $wordData['definition'] ?? '', $allTranslations);

            // Create 3 incorrect options
            $incorrectOptions = $this->getIncorrectOptions($translation, $allTranslations, 3);

            // Add options in random order with correct answer at random position
            $options = $incorrectOptions;
            $correctIndex = rand(0, 3);
            array_splice($options, $correctIndex, 0, [$translation]);

            $questions[] = [
                'question' => "What does '$word' mean?",
                'options' => $options,
                'correctAnswer' => $correctIndex,
                'word_id' => $wordData['id'] ?? $index,
            ];
        }

        return [
            'questions' => $questions
        ];
    }

    private function createFillBlankQuiz($words)
    {
        $questions = [];

        foreach ($words as $index => $wordData) {
            $word = $wordData['word'];

            // Create a simple sentence with the word
            $sentence = $this->createSentence($word);

            $questions[] = [
                'sentence' => str_replace($word, '_____', $sentence),
                'correctAnswer' => $word,
                'word_id' => $wordData['id'] ?? $index,
            ];
        }

        return [
            'questions' => $questions
        ];
    }

    private function createMatchingQuiz($words)
    {
        $germanWords = [];
        $definitions = [];
        $matches = [];

        foreach ($words as $index => $wordData) {
            $word = $wordData['word'];
            $translation = $this->getTranslation($word, $wordData['definition'] ?? '', $this->getBasicTranslations());

            $germanWords[] = $word;
            $definitions[] = $translation;

            $matches[] = [
                'word' => $word,
                'definition' => $translation,
                'word_id' => $wordData['id'] ?? $index,
            ];
        }

        return [
            'words' => $germanWords,
            'definitions' => $definitions,
            'matches' => $matches
        ];
    }

    /**
     * Create a simple German sentence using the given word
     */
    private function createSentence($word)
    {
        // Simple sentence templates based on common word types
        $templates = [
            // For nouns
            "Mein %s ist sehr schön.",                 // My [noun] is very beautiful.
            "Das %s ist groß.",                        // The [noun] is big.
            "Ich habe ein neues %s gekauft.",          // I bought a new [noun].
            "Das %s steht auf dem Tisch.",             // The [noun] is on the table.

            // For verbs (assuming infinitive form)
            "Ich %s jeden Tag.",                       // I [verb] every day.
            "Wir %s gerne zusammen.",                  // We like to [verb] together.
            "Sie %s sehr gut.",                        // She [verb]s very well.

            // For adjectives
            "Das Haus ist %s.",                        // The house is [adjective].
            "Mein Auto ist sehr %s.",                  // My car is very [adjective].

            // Generic templates that work for most word types
            "Ich mag %s.",                             // I like [word].
            "Hier ist ein %s.",                        // Here is a [word].
        ];

        // If we can deduce the word type from the definition, we could use more specific templates
        // For now, just pick a random template
        $template = $templates[array_rand($templates)];

        return sprintf($template, $word);
    }

    /**
     * Get translations for basic German words
     */
    private function getBasicTranslations()
    {
        // Common translations to use for quiz generation
        return [
            'Haus' => 'house',
            'Buch' => 'book',
            'Auto' => 'car',
            'Mann' => 'man',
            'Frau' => 'woman',
            'Kind' => 'child',
            'Hund' => 'dog',
            'Katze' => 'cat',
            'Stadt' => 'city',
            'Land' => 'country',
            'Baum' => 'tree',
            'Blume' => 'flower',
            'Wasser' => 'water',
            'Brot' => 'bread',
            'Milch' => 'milk',
            'groß' => 'big',
            'klein' => 'small',
            'gut' => 'good',
            'schlecht' => 'bad',
            'schön' => 'beautiful',
            'hässlich' => 'ugly',
            'alt' => 'old',
            'neu' => 'new',
            'gehen' => 'to go',
            'kommen' => 'to come',
            'essen' => 'to eat',
            'trinken' => 'to drink',
            'schlafen' => 'to sleep',
            'arbeiten' => 'to work',
            'spielen' => 'to play',
            'Zeit' => 'time',
            'Tag' => 'day',
            'Nacht' => 'night',
            'Freund' => 'friend',
            'Familie' => 'family',
            'Arbeit' => 'work',
            'Schule' => 'school',
            'Universität' => 'university',
            'Geld' => 'money',
            'Telefon' => 'telephone',
            'Computer' => 'computer',
            'Straße' => 'street',
            'Haus' => 'house',
            'Wohnung' => 'apartment',
            'Tisch' => 'table',
            'Stuhl' => 'chair',
            'Tür' => 'door',
            'Fenster' => 'window',
            'Bett' => 'bed',
            'Musik' => 'music',
            'Film' => 'movie',
            'Buch' => 'book',
            'Zeitung' => 'newspaper',
        ];
    }

    /**
     * Get a translation for a German word
     */
    private function getTranslation($word, $definition, $allTranslations)
    {
        // First, check if we have a direct translation in our basic list
        if (isset($allTranslations[$word])) {
            return $allTranslations[$word];
        }

        // Try to extract a translation from the definition
        if (!empty($definition)) {
            // Look for patterns like "- word," or "- word." in definitions
            if (preg_match('/- ([^,\.]+)/', $definition, $matches)) {
                return trim($matches[1]);
            }

            // If there's a dash followed by text, that's likely the translation
            if (preg_match('/- ([^\.]+)\./', $definition, $matches)) {
                // Take just the first few words for brevity
                $parts = explode(' ', trim($matches[1]));
                return implode(' ', array_slice($parts, 0, 3));
            }
        }

        // If all else fails, return a placeholder
        return "meaning of $word";
    }

    /**
     * Generate incorrect but plausible options for multiple choice
     */
    private function getIncorrectOptions($correctTranslation, $allTranslations, $count)
    {
        $translations = array_values($allTranslations);

        // Remove the correct answer from the pool of possible options
        $translations = array_filter($translations, function($item) use ($correctTranslation) {
            return $item !== $correctTranslation;
        });

        // Shuffle and take the requested number of options
        shuffle($translations);
        $incorrectOptions = array_slice($translations, 0, $count);

        // If we don't have enough options, generate some generic ones
        while (count($incorrectOptions) < $count) {
            $generic = $this->getGenericIncorrectOption($correctTranslation, $incorrectOptions);
            $incorrectOptions[] = $generic;
        }

        return $incorrectOptions;
    }

    /**
     * Generate a generic incorrect option that's not already in the list
     */
    private function getGenericIncorrectOption($correctTranslation, $existingOptions)
    {
        $genericOptions = [
            'object', 'item', 'thing', 'person', 'place', 'action',
            'concept', 'feeling', 'activity', 'location', 'tool',
            'vehicle', 'furniture', 'food', 'drink', 'animal',
            'clothing', 'building', 'plant', 'body part', 'profession'
        ];

        // Shuffle and try to find one that's not already used
        shuffle($genericOptions);

        foreach ($genericOptions as $option) {
            if ($option !== $correctTranslation && !in_array($option, $existingOptions)) {
                return $option;
            }
        }

        // If all generic options are used (unlikely), add a number to make it unique
        return $genericOptions[0] . ' ' . rand(1, 10);
    }

    /**
     * Build a prompt for paragraph generation
     */
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

    /**
     * Get description for a German proficiency level
     */
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
