<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\SavedWord;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DefaultVocabularySeeder extends Seeder
{
    /**
     * Run the database seeds to add default vocabulary words to users.
     */
    public function run(): void
    {
        // Get all users
        $users = User::all();

        // Common German words by category
        $commonWords = $this->getCommonWords();

        foreach ($users as $user) {
            $this->addDefaultWordsToUser($user, $commonWords);
        }

        $this->command->info('Default vocabulary words have been added to all users.');
    }

    /**
     * Add default vocabulary words to a specific user
     */
    public function addDefaultWordsToUser(User $user, ?array $commonWords = null): void
    {
        if (!$commonWords) {
            $commonWords = $this->getCommonWords();
        }

        $existingWords = $user->savedWords()->pluck('word')->toArray();
        $wordsToAdd = [];

        foreach ($commonWords as $category => $words) {
            foreach ($words as $wordData) {
                // Skip words that user already has
                if (in_array($wordData['word'], $existingWords)) {
                    continue;
                }

                $wordsToAdd[] = [
                    'word' => $wordData['word'],
                    'definition' => $wordData['definition'],
                    'user_id' => $user->id,
                    'category' => $category,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];

                // To avoid too large of a batch insert
                if (count($wordsToAdd) >= 100) {
                    DB::table('saved_words')->insert($wordsToAdd);
                    $wordsToAdd = [];
                }
            }
        }

        // Insert any remaining words
        if (!empty($wordsToAdd)) {
            DB::table('saved_words')->insert($wordsToAdd);
        }
    }

    /**
     * Get common German words organized by category
     */
    private function getCommonWords(): array
    {
        return [
            'Basics' => [
                ['word' => 'ja', 'definition' => 'yes'],
                ['word' => 'nein', 'definition' => 'no'],
                ['word' => 'bitte', 'definition' => 'please'],
                ['word' => 'danke', 'definition' => 'thank you'],
                ['word' => 'hallo', 'definition' => 'hello'],
                ['word' => 'tschüss', 'definition' => 'bye'],
                ['word' => 'auf Wiedersehen', 'definition' => 'goodbye'],
                ['word' => 'entschuldigung', 'definition' => 'excuse me/sorry'],
                ['word' => 'guten Morgen', 'definition' => 'good morning'],
                ['word' => 'guten Tag', 'definition' => 'good day'],
                ['word' => 'guten Abend', 'definition' => 'good evening'],
                ['word' => 'gute Nacht', 'definition' => 'good night'],
                ['word' => 'wie geht\'s?', 'definition' => 'how are you?'],
            ],
            'Pronouns' => [
                ['word' => 'ich', 'definition' => 'I'],
                ['word' => 'du', 'definition' => 'you (informal)'],
                ['word' => 'er', 'definition' => 'he'],
                ['word' => 'sie', 'definition' => 'she'],
                ['word' => 'es', 'definition' => 'it'],
                ['word' => 'wir', 'definition' => 'we'],
                ['word' => 'ihr', 'definition' => 'you all (informal)'],
                ['word' => 'sie', 'definition' => 'they'],
                ['word' => 'Sie', 'definition' => 'you (formal)'],
                ['word' => 'mein', 'definition' => 'my'],
                ['word' => 'dein', 'definition' => 'your (informal)'],
                ['word' => 'sein', 'definition' => 'his'],
                ['word' => 'ihr', 'definition' => 'her'],
                ['word' => 'unser', 'definition' => 'our'],
                ['word' => 'euer', 'definition' => 'your (plural)'],
                ['word' => 'ihr', 'definition' => 'their'],
            ],
            'Numbers' => [
                ['word' => 'null', 'definition' => 'zero'],
                ['word' => 'eins', 'definition' => 'one'],
                ['word' => 'zwei', 'definition' => 'two'],
                ['word' => 'drei', 'definition' => 'three'],
                ['word' => 'vier', 'definition' => 'four'],
                ['word' => 'fünf', 'definition' => 'five'],
                ['word' => 'sechs', 'definition' => 'six'],
                ['word' => 'sieben', 'definition' => 'seven'],
                ['word' => 'acht', 'definition' => 'eight'],
                ['word' => 'neun', 'definition' => 'nine'],
                ['word' => 'zehn', 'definition' => 'ten'],
                ['word' => 'elf', 'definition' => 'eleven'],
                ['word' => 'zwölf', 'definition' => 'twelve'],
                ['word' => 'zwanzig', 'definition' => 'twenty'],
                ['word' => 'dreißig', 'definition' => 'thirty'],
                ['word' => 'hundert', 'definition' => 'hundred'],
                ['word' => 'tausend', 'definition' => 'thousand'],
            ],
            'Common Verbs' => [
                ['word' => 'sein', 'definition' => 'to be'],
                ['word' => 'haben', 'definition' => 'to have'],
                ['word' => 'gehen', 'definition' => 'to go'],
                ['word' => 'kommen', 'definition' => 'to come'],
                ['word' => 'machen', 'definition' => 'to do/make'],
                ['word' => 'sagen', 'definition' => 'to say'],
                ['word' => 'sprechen', 'definition' => 'to speak'],
                ['word' => 'essen', 'definition' => 'to eat'],
                ['word' => 'trinken', 'definition' => 'to drink'],
                ['word' => 'schlafen', 'definition' => 'to sleep'],
                ['word' => 'lesen', 'definition' => 'to read'],
                ['word' => 'schreiben', 'definition' => 'to write'],
                ['word' => 'arbeiten', 'definition' => 'to work'],
                ['word' => 'spielen', 'definition' => 'to play'],
                ['word' => 'lernen', 'definition' => 'to learn'],
                ['word' => 'kaufen', 'definition' => 'to buy'],
                ['word' => 'verkaufen', 'definition' => 'to sell'],
                ['word' => 'helfen', 'definition' => 'to help'],
                ['word' => 'lieben', 'definition' => 'to love'],
                ['word' => 'mögen', 'definition' => 'to like'],
            ],
            'Time & Days' => [
                ['word' => 'Tag', 'definition' => 'day'],
                ['word' => 'Woche', 'definition' => 'week'],
                ['word' => 'Monat', 'definition' => 'month'],
                ['word' => 'Jahr', 'definition' => 'year'],
                ['word' => 'heute', 'definition' => 'today'],
                ['word' => 'morgen', 'definition' => 'tomorrow'],
                ['word' => 'gestern', 'definition' => 'yesterday'],
                ['word' => 'jetzt', 'definition' => 'now'],
                ['word' => 'Zeit', 'definition' => 'time'],
                ['word' => 'Stunde', 'definition' => 'hour'],
                ['word' => 'Minute', 'definition' => 'minute'],
                ['word' => 'Sekunde', 'definition' => 'second'],
                ['word' => 'Montag', 'definition' => 'Monday'],
                ['word' => 'Dienstag', 'definition' => 'Tuesday'],
                ['word' => 'Mittwoch', 'definition' => 'Wednesday'],
                ['word' => 'Donnerstag', 'definition' => 'Thursday'],
                ['word' => 'Freitag', 'definition' => 'Friday'],
                ['word' => 'Samstag', 'definition' => 'Saturday'],
                ['word' => 'Sonntag', 'definition' => 'Sunday'],
            ],
            'Colors' => [
                ['word' => 'rot', 'definition' => 'red'],
                ['word' => 'blau', 'definition' => 'blue'],
                ['word' => 'grün', 'definition' => 'green'],
                ['word' => 'gelb', 'definition' => 'yellow'],
                ['word' => 'schwarz', 'definition' => 'black'],
                ['word' => 'weiß', 'definition' => 'white'],
                ['word' => 'grau', 'definition' => 'gray'],
                ['word' => 'braun', 'definition' => 'brown'],
                ['word' => 'orange', 'definition' => 'orange'],
                ['word' => 'lila', 'definition' => 'purple'],
                ['word' => 'rosa', 'definition' => 'pink'],
            ],
            'Food & Drink' => [
                ['word' => 'Wasser', 'definition' => 'water'],
                ['word' => 'Brot', 'definition' => 'bread'],
                ['word' => 'Kaffee', 'definition' => 'coffee'],
                ['word' => 'Tee', 'definition' => 'tea'],
                ['word' => 'Milch', 'definition' => 'milk'],
                ['word' => 'Apfel', 'definition' => 'apple'],
                ['word' => 'Banane', 'definition' => 'banana'],
                ['word' => 'Käse', 'definition' => 'cheese'],
                ['word' => 'Butter', 'definition' => 'butter'],
                ['word' => 'Ei', 'definition' => 'egg'],
                ['word' => 'Fleisch', 'definition' => 'meat'],
                ['word' => 'Gemüse', 'definition' => 'vegetables'],
                ['word' => 'Obst', 'definition' => 'fruit'],
                ['word' => 'Suppe', 'definition' => 'soup'],
                ['word' => 'Salat', 'definition' => 'salad'],
                ['word' => 'Reis', 'definition' => 'rice'],
                ['word' => 'Nudeln', 'definition' => 'pasta'],
                ['word' => 'Zucker', 'definition' => 'sugar'],
                ['word' => 'Salz', 'definition' => 'salt'],
            ],
            'Places' => [
                ['word' => 'Haus', 'definition' => 'house'],
                ['word' => 'Wohnung', 'definition' => 'apartment'],
                ['word' => 'Schule', 'definition' => 'school'],
                ['word' => 'Universität', 'definition' => 'university'],
                ['word' => 'Büro', 'definition' => 'office'],
                ['word' => 'Restaurant', 'definition' => 'restaurant'],
                ['word' => 'Supermarkt', 'definition' => 'supermarket'],
                ['word' => 'Bank', 'definition' => 'bank'],
                ['word' => 'Hotel', 'definition' => 'hotel'],
                ['word' => 'Bahnhof', 'definition' => 'train station'],
                ['word' => 'Flughafen', 'definition' => 'airport'],
                ['word' => 'Krankenhaus', 'definition' => 'hospital'],
                ['word' => 'Stadt', 'definition' => 'city'],
                ['word' => 'Dorf', 'definition' => 'village'],
                ['word' => 'Land', 'definition' => 'country'],
                ['word' => 'Straße', 'definition' => 'street'],
                ['word' => 'Park', 'definition' => 'park'],
                ['word' => 'Bibliothek', 'definition' => 'library'],
            ],
            'Adjectives' => [
                ['word' => 'groß', 'definition' => 'big'],
                ['word' => 'klein', 'definition' => 'small'],
                ['word' => 'gut', 'definition' => 'good'],
                ['word' => 'schlecht', 'definition' => 'bad'],
                ['word' => 'neu', 'definition' => 'new'],
                ['word' => 'alt', 'definition' => 'old'],
                ['word' => 'heiß', 'definition' => 'hot'],
                ['word' => 'kalt', 'definition' => 'cold'],
                ['word' => 'jung', 'definition' => 'young'],
                ['word' => 'schön', 'definition' => 'beautiful'],
                ['word' => 'hässlich', 'definition' => 'ugly'],
                ['word' => 'schnell', 'definition' => 'fast'],
                ['word' => 'langsam', 'definition' => 'slow'],
                ['word' => 'schwer', 'definition' => 'heavy/difficult'],
                ['word' => 'leicht', 'definition' => 'light/easy'],
                ['word' => 'richtig', 'definition' => 'correct'],
                ['word' => 'falsch', 'definition' => 'wrong'],
                ['word' => 'wichtig', 'definition' => 'important'],
                ['word' => 'teuer', 'definition' => 'expensive'],
                ['word' => 'billig', 'definition' => 'cheap'],
            ],
            'Family' => [
                ['word' => 'Familie', 'definition' => 'family'],
                ['word' => 'Mutter', 'definition' => 'mother'],
                ['word' => 'Vater', 'definition' => 'father'],
                ['word' => 'Eltern', 'definition' => 'parents'],
                ['word' => 'Tochter', 'definition' => 'daughter'],
                ['word' => 'Sohn', 'definition' => 'son'],
                ['word' => 'Schwester', 'definition' => 'sister'],
                ['word' => 'Bruder', 'definition' => 'brother'],
                ['word' => 'Großmutter', 'definition' => 'grandmother'],
                ['word' => 'Großvater', 'definition' => 'grandfather'],
                ['word' => 'Tante', 'definition' => 'aunt'],
                ['word' => 'Onkel', 'definition' => 'uncle'],
                ['word' => 'Cousin', 'definition' => 'male cousin'],
                ['word' => 'Cousine', 'definition' => 'female cousin'],
            ],
        ];
    }
}
