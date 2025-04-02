<?php

namespace App\Services;

class VocabularyService
{
    /**
     * Get a list of available vocabulary categories
     *
     * @return array
     */
    public function getCategories(): array
    {
        return [
            'Familie' => 'Family & Relationships',
            'Zuhause' => 'Home & Household',
            'Essen' => 'Food & Drink',
            'Kleidung' => 'Clothing & Fashion',
            'Gesundheit' => 'Health & Body',
            'Reisen' => 'Travel & Transportation',
            'Bildung' => 'Education & School',
            'Arbeit' => 'Work & Career',
            'Sport' => 'Sports & Recreation',
            'Natur' => 'Nature & Environment',
            'Wetter' => 'Weather & Seasons',
            'Zahlen' => 'Numbers & Mathematics',
            'Zeit' => 'Time & Dates',
            'Farben' => 'Colors & Shapes',
            'Tiere' => 'Animals & Wildlife',
            'Technologie' => 'Technology & Internet',
            'Kunst' => 'Arts & Culture',
            'Medien' => 'Media & Entertainment',
            'Politik' => 'Politics & Government',
            'Wirtschaft' => 'Economy & Business',
            'Recht' => 'Law & Justice',
            'Emotionen' => 'Emotions & Feelings',
            'Persönlichkeit' => 'Personality & Character',
            'Kommunikation' => 'Communication & Language',
            'Feiertage' => 'Holidays & Celebrations',
            'Städte' => 'Cities & Places',
            'Geographie' => 'Geography & Landscape',
            'Wissenschaft' => 'Science & Research',
            'Geschichte' => 'History & Events',
            'Philosophie' => 'Philosophy & Religion',
        ];
    }

    /**
     * Generate a list of German words by category
     *
     * @param string $category
     * @param int $count
     * @return array
     */
    public function getWordsByCategory(string $category, int $count = 10): array
    {
        $words = $this->wordDatabase[$category] ?? $this->wordDatabase['Familie'];

        // Return random selection of words from the category
        shuffle($words);
        return array_slice($words, 0, min($count, count($words)));
    }

    /**
     * Database of German words organized by category
     *
     * @var array
     */
    private $wordDatabase = [
        'Familie' => [
            ['word' => 'die Familie', 'definition' => 'family'],
            ['word' => 'der Vater', 'definition' => 'father'],
            ['word' => 'die Mutter', 'definition' => 'mother'],
            ['word' => 'der Sohn', 'definition' => 'son'],
            ['word' => 'die Tochter', 'definition' => 'daughter'],
            ['word' => 'der Bruder', 'definition' => 'brother'],
            ['word' => 'die Schwester', 'definition' => 'sister'],
            ['word' => 'die Großeltern', 'definition' => 'grandparents'],
            ['word' => 'der Großvater', 'definition' => 'grandfather'],
            ['word' => 'die Großmutter', 'definition' => 'grandmother'],
            ['word' => 'der Onkel', 'definition' => 'uncle'],
            ['word' => 'die Tante', 'definition' => 'aunt'],
            ['word' => 'der Cousin', 'definition' => 'male cousin'],
            ['word' => 'die Cousine', 'definition' => 'female cousin'],
            ['word' => 'die Eltern', 'definition' => 'parents'],
            ['word' => 'die Geschwister', 'definition' => 'siblings'],
            ['word' => 'der Ehemann', 'definition' => 'husband'],
            ['word' => 'die Ehefrau', 'definition' => 'wife'],
            ['word' => 'der Schwiegervater', 'definition' => 'father-in-law'],
            ['word' => 'die Schwiegermutter', 'definition' => 'mother-in-law'],
        ],
        'Zuhause' => [
            ['word' => 'das Haus', 'definition' => 'house'],
            ['word' => 'die Wohnung', 'definition' => 'apartment'],
            ['word' => 'das Zimmer', 'definition' => 'room'],
            ['word' => 'die Küche', 'definition' => 'kitchen'],
            ['word' => 'das Badezimmer', 'definition' => 'bathroom'],
            ['word' => 'das Schlafzimmer', 'definition' => 'bedroom'],
            ['word' => 'das Wohnzimmer', 'definition' => 'living room'],
            ['word' => 'der Tisch', 'definition' => 'table'],
            ['word' => 'der Stuhl', 'definition' => 'chair'],
            ['word' => 'das Sofa', 'definition' => 'sofa'],
            ['word' => 'das Bett', 'definition' => 'bed'],
            ['word' => 'der Schrank', 'definition' => 'cabinet'],
            ['word' => 'der Kühlschrank', 'definition' => 'refrigerator'],
            ['word' => 'der Herd', 'definition' => 'stove'],
            ['word' => 'der Ofen', 'definition' => 'oven'],
            ['word' => 'die Spülmaschine', 'definition' => 'dishwasher'],
            ['word' => 'die Waschmaschine', 'definition' => 'washing machine'],
            ['word' => 'der Fernseher', 'definition' => 'television'],
            ['word' => 'der Garten', 'definition' => 'garden'],
            ['word' => 'der Balkon', 'definition' => 'balcony'],
        ],
        'Essen' => [
            ['word' => 'das Brot', 'definition' => 'bread'],
            ['word' => 'der Käse', 'definition' => 'cheese'],
            ['word' => 'die Milch', 'definition' => 'milk'],
            ['word' => 'das Ei', 'definition' => 'egg'],
            ['word' => 'das Fleisch', 'definition' => 'meat'],
            ['word' => 'das Huhn', 'definition' => 'chicken'],
            ['word' => 'der Fisch', 'definition' => 'fish'],
            ['word' => 'das Gemüse', 'definition' => 'vegetables'],
            ['word' => 'die Karotte', 'definition' => 'carrot'],
            ['word' => 'die Kartoffel', 'definition' => 'potato'],
            ['word' => 'der Reis', 'definition' => 'rice'],
            ['word' => 'die Nudeln', 'definition' => 'pasta'],
            ['word' => 'der Apfel', 'definition' => 'apple'],
            ['word' => 'die Banane', 'definition' => 'banana'],
            ['word' => 'die Orange', 'definition' => 'orange'],
            ['word' => 'die Suppe', 'definition' => 'soup'],
            ['word' => 'der Salat', 'definition' => 'salad'],
            ['word' => 'der Kuchen', 'definition' => 'cake'],
            ['word' => 'die Schokolade', 'definition' => 'chocolate'],
            ['word' => 'das Wasser', 'definition' => 'water'],
        ],
        'Kleidung' => [
            ['word' => 'die Kleidung', 'definition' => 'clothing'],
            ['word' => 'das Hemd', 'definition' => 'shirt'],
            ['word' => 'die Hose', 'definition' => 'pants'],
            ['word' => 'der Rock', 'definition' => 'skirt'],
            ['word' => 'das Kleid', 'definition' => 'dress'],
            ['word' => 'der Pullover', 'definition' => 'sweater'],
            ['word' => 'die Jacke', 'definition' => 'jacket'],
            ['word' => 'der Mantel', 'definition' => 'coat'],
            ['word' => 'die Socken', 'definition' => 'socks'],
            ['word' => 'die Schuhe', 'definition' => 'shoes'],
            ['word' => 'die Stiefel', 'definition' => 'boots'],
            ['word' => 'die Mütze', 'definition' => 'cap'],
            ['word' => 'der Hut', 'definition' => 'hat'],
            ['word' => 'der Schal', 'definition' => 'scarf'],
            ['word' => 'die Handschuhe', 'definition' => 'gloves'],
            ['word' => 'die Unterwäsche', 'definition' => 'underwear'],
            ['word' => 'der Anzug', 'definition' => 'suit'],
            ['word' => 'die Krawatte', 'definition' => 'tie'],
            ['word' => 'der Gürtel', 'definition' => 'belt'],
            ['word' => 'die Tasche', 'definition' => 'bag'],
        ],
        'Sport' => [
            ['word' => 'der Sport', 'definition' => 'sport'],
            ['word' => 'der Fußball', 'definition' => 'soccer'],
            ['word' => 'der Basketball', 'definition' => 'basketball'],
            ['word' => 'der Tennis', 'definition' => 'tennis'],
            ['word' => 'das Schwimmen', 'definition' => 'swimming'],
            ['word' => 'das Laufen', 'definition' => 'running'],
            ['word' => 'das Radfahren', 'definition' => 'cycling'],
            ['word' => 'das Skifahren', 'definition' => 'skiing'],
            ['word' => 'das Fitnessstudio', 'definition' => 'gym'],
            ['word' => 'das Training', 'definition' => 'training'],
            ['word' => 'der Wettkampf', 'definition' => 'competition'],
            ['word' => 'der Spieler', 'definition' => 'player'],
            ['word' => 'der Trainer', 'definition' => 'coach'],
            ['word' => 'die Mannschaft', 'definition' => 'team'],
            ['word' => 'der Ball', 'definition' => 'ball'],
            ['word' => 'das Tor', 'definition' => 'goal'],
            ['word' => 'die Medaille', 'definition' => 'medal'],
            ['word' => 'der Sieger', 'definition' => 'winner'],
            ['word' => 'das Spiel', 'definition' => 'game'],
            ['word' => 'die Olympischen Spiele', 'definition' => 'Olympic Games'],
        ],
        'Bildung' => [
            ['word' => 'die Schule', 'definition' => 'school'],
            ['word' => 'die Universität', 'definition' => 'university'],
            ['word' => 'der Lehrer', 'definition' => 'teacher (male)'],
            ['word' => 'die Lehrerin', 'definition' => 'teacher (female)'],
            ['word' => 'der Schüler', 'definition' => 'student (male, school)'],
            ['word' => 'die Schülerin', 'definition' => 'student (female, school)'],
            ['word' => 'der Student', 'definition' => 'student (male, university)'],
            ['word' => 'die Studentin', 'definition' => 'student (female, university)'],
            ['word' => 'das Klassenzimmer', 'definition' => 'classroom'],
            ['word' => 'der Unterricht', 'definition' => 'lesson'],
            ['word' => 'die Hausaufgabe', 'definition' => 'homework'],
            ['word' => 'die Prüfung', 'definition' => 'exam'],
            ['word' => 'das Buch', 'definition' => 'book'],
            ['word' => 'das Heft', 'definition' => 'notebook'],
            ['word' => 'der Stift', 'definition' => 'pen'],
            ['word' => 'der Bleistift', 'definition' => 'pencil'],
            ['word' => 'die Tafel', 'definition' => 'blackboard'],
            ['word' => 'das Fach', 'definition' => 'subject'],
            ['word' => 'die Mathematik', 'definition' => 'mathematics'],
            ['word' => 'die Sprache', 'definition' => 'language'],
        ],
    ];
}
