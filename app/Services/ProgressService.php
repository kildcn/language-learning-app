<?php

namespace App\Services;

use App\Models\User;
use App\Models\SavedWord;
use App\Models\QuizAttempt;
use Illuminate\Support\Facades\DB;

class ProgressService
{
    // Define level thresholds - users will level up when reaching these points
    const LEVEL_THRESHOLDS = [
        1, 50, 125, 250, 375, 500, 750, 1000, 1250,
        1500, 1750, 2000, 2250, 2500, 2750, 3000, 3250, 3500,
        3750, 4000, 4250, 4500, 4750, 5000, 5500, 6000, 6500,
        7000, 7500, 8000, 8500, 9000, 9500, 9999
    ];

    // Define level names
    const LEVEL_NAMES = [
        1 => 'Anfängerchen', // Little Beginner
        50 => 'Buchstabenzähler', // Letter Counter
        125 => 'Artikelritter', // Knight of the Articles
        250 => 'Wortschatzsucher', // Vocabulary Seeker
        375 => 'Satzbauer', // Sentence Builder
        500 => 'Grammatikknacker', // Grammar Cracker
        750 => 'Umlautmeister', // Master of ÜÖÄ
        1000 => 'Zwischenredner', // Intermediate Speaker
        1250 => 'Konjugationskönner', // Conjugation Pro
        1500 => 'Kasuskapitän', // Captain of the Cases
        1750 => 'Flüssigkeitstänzer', // Fluency Dancer
        2000 => 'Fehlerjäger', // Mistake Hunter
        2250 => 'Redewendungssammler', // Idiom Collector
        2500 => 'Wortjongleur', // Word Juggler
        2750 => 'Syntaxzauberer', // Syntax Wizard
        3000 => 'Sprachdetektiv', // Language Detective
        3250 => 'Dialogdompteur', // Dialogue Tamer
        3500 => 'Akkusativakrobat', // Accusative Acrobat
        3750 => 'Sprechmeister', // Speech Master
        4000 => 'Redekünstler', // Speaking Artist
        4250 => 'Kulturtaucher', // Culture Diver
        4500 => 'Textversteher', // Text Comprehender
        4750 => 'Ausdrucksarchitekt', // Expression Architect
        5000 => 'Fluenzfürst', // Fluency Prince
        5500 => 'Redesamurai', // Speech Samurai
        6000 => 'Grammatikgott', // Grammar God
        6500 => 'Lautlegende', // Legend of Sound
        7000 => 'Meister des Genus', // Master of Gender
        7500 => 'Wortschatzkaiser', // Vocabulary Emperor
        8000 => 'Sinnschmied', // Meaning Blacksmith
        8500 => 'Sprachgeist', // Language Spirit
        9000 => 'Deutschdominator', // German Dominator
        9500 => 'Hochsprachenheld', // High Language Hero
        9999 => 'Sprachmeister', // Language Master
    ];

    /**
     * Calculate a user's current level and progress
     *
     * @param User $user
     * @return array
     */
    public function getUserProgress(User $user): array
    {
        // Get stats for different activities
        $wordCount = $this->getVocabularyStats($user);
        $quizStats = $this->getQuizStats($user);
        $paragraphStats = $this->getParagraphStats($user);

        // Calculate points from various activities
        $points = $this->calculateTotalPoints($wordCount, $quizStats, $paragraphStats);

        // Determine current level and next level threshold
        $currentLevel = $this->determineLevel($points);
        $nextLevelThreshold = $this->getNextLevelThreshold($currentLevel);
        $currentLevelName = $this->getLevelName($currentLevel);

        // Calculate percentage progress to next level
        $previousLevelThreshold = $this->getPreviousLevelThreshold($currentLevel);
        $pointsForCurrentLevel = $points - $previousLevelThreshold;
        $pointsNeededForNextLevel = $nextLevelThreshold - $previousLevelThreshold;

        $percentageToNextLevel = 0;
        if ($pointsNeededForNextLevel > 0) {
            $percentageToNextLevel = min(100, round(($pointsForCurrentLevel / $pointsNeededForNextLevel) * 100));
        }
        $nextLevelName = $this->getLevelName(min(9999, $currentLevel + 1));

        // Remove CEFR level references
        return [
            'level' => $currentLevel,
            'level_name' => $currentLevelName,
            'points' => $points,
            'next_level' => min(9999, $currentLevel + 1),
            'next_level_name' => $nextLevelName,
            'next_level_points' => $nextLevelThreshold,
            'current_level_points' => $previousLevelThreshold,
            'percentage_to_next_level' => $percentageToNextLevel,
            'stats' => [
                'words_learned' => $wordCount['total'],
                'quiz_score_avg' => $quizStats['avg_score'],
                'quiz_attempts' => $quizStats['attempts'],
                'paragraphs_read' => $paragraphStats['total'],
            ]
        ];
    }

    /**
     * Calculate vocabulary statistics
     *
     * @param User $user
     * @return array
     */
    private function getVocabularyStats(User $user): array
    {
        $wordCount = $user->savedWords()->count();

        // Count words by difficulty
        $beginnerWords = $user->savedWords()
            ->whereRaw('LENGTH(word) <= 5')
            ->count();

        $intermediateWords = $user->savedWords()
            ->whereRaw('LENGTH(word) > 5 AND LENGTH(word) <= 10')
            ->count();

        $advancedWords = $user->savedWords()
            ->whereRaw('LENGTH(word) > 10')
            ->count();

        return [
            'total' => $wordCount,
            'beginner' => $beginnerWords,
            'intermediate' => $intermediateWords,
            'advanced' => $advancedWords,
        ];
    }

    /**
     * Calculate quiz statistics
     *
     * @param User $user
     * @return array
     */
    private function getQuizStats(User $user): array
    {
        $attempts = $user->quizAttempts()->count();

        if ($attempts === 0) {
            return [
                'attempts' => 0,
                'avg_score' => 0,
                'correct_answers' => 0,
                'total_questions' => 0,
            ];
        }

        // Get total correct answers and total questions
        $quizStats = $user->quizAttempts()
            ->select(DB::raw('SUM(score) as correct_answers, COUNT(*) as total_attempts'))
            ->first();

        // Estimated total questions (since we don't store this directly)
        // Each quiz has approximately 10 questions on average
        $estimatedTotalQuestions = $attempts * 10;

        // Calculate average score percentage
        $avgScore = 0;
        if ($estimatedTotalQuestions > 0) {
            $avgScore = round(($quizStats->correct_answers / $estimatedTotalQuestions) * 100);
        }

        return [
            'attempts' => $attempts,
            'avg_score' => $avgScore,
            'correct_answers' => $quizStats->correct_answers ?? 0,
            'total_questions' => $estimatedTotalQuestions,
        ];
    }

    /**
     * Calculate paragraph statistics
     *
     * @param User $user
     * @return array
     */
    private function getParagraphStats(User $user): array
    {
        $paragraphCount = $user->paragraphs()->count();

        // Count paragraphs by level
        $a2Paragraphs = $user->paragraphs()->where('level', 'A2')->count();
        $b1Paragraphs = $user->paragraphs()->where('level', 'B1')->count();
        $b2Paragraphs = $user->paragraphs()->where('level', 'B2')->count();
        $c1Paragraphs = $user->paragraphs()->where('level', 'C1')->count();

        return [
            'total' => $paragraphCount,
            'A2' => $a2Paragraphs,
            'B1' => $b1Paragraphs,
            'B2' => $b2Paragraphs,
            'C1' => $c1Paragraphs,
        ];
    }

    /**
     * Calculate total points from all learning activities
     *
     * @param array $wordStats
     * @param array $quizStats
     * @param array $paragraphStats
     * @return int
     */
    private function calculateTotalPoints(array $wordStats, array $quizStats, array $paragraphStats): int
    {
        $points = 0;

        // Points from vocabulary
        $points += $wordStats['beginner'] * 1;       // 1 point per beginner word
        $points += $wordStats['intermediate'] * 2;   // 2 points per intermediate word
        $points += $wordStats['advanced'] * 3;       // 3 points per advanced word

        // Points from quizzes
        $points += $quizStats['attempts'] * 5;                       // 5 points per quiz attempt
        $points += floor(($quizStats['avg_score'] / 10) * 2);        // Up to 20 points for quiz performance

        // Points from paragraphs
        $points += $paragraphStats['A2'] * 5;        // 5 points per A2 paragraph
        $points += $paragraphStats['B1'] * 10;       // 10 points per B1 paragraph
        $points += $paragraphStats['B2'] * 15;       // 15 points per B2 paragraph
        $points += $paragraphStats['C1'] * 20;       // 20 points per C1 paragraph

        return $points;
    }

    /**
     * Determine the user's level based on points
     *
     * @param int $points
     * @return int
     */
    private function determineLevel(int $points): int
    {
        // Default level is 1
        $level = 1;

        foreach (self::LEVEL_THRESHOLDS as $threshold) {
            if ($points >= $threshold) {
                $level = $threshold;
            } else {
                break;
            }
        }

        return $level;
    }

    /**
     * Get the next level threshold
     *
     * @param int $currentLevel
     * @return int
     */
    private function getNextLevelThreshold(int $currentLevel): int
    {
        $thresholds = self::LEVEL_THRESHOLDS;
        $index = array_search($currentLevel, $thresholds);

        if ($index !== false && isset($thresholds[$index + 1])) {
            return $thresholds[$index + 1];
        }

        // If we're at the max level, return the same level
        return $currentLevel;
    }

    /**
     * Get the previous level threshold
     *
     * @param int $currentLevel
     * @return int
     */
    private function getPreviousLevelThreshold(int $currentLevel): int
    {
        $thresholds = self::LEVEL_THRESHOLDS;
        $index = array_search($currentLevel, $thresholds);

        if ($index !== false && $index > 0) {
            return $thresholds[$index - 1];
        }

        // If we're at the first level, return 0
        return 0;
    }

    /**
     * Get the level name based on the level number
     *
     * @param int $level
     * @return string
     */
    private function getLevelName(int $level): string
    {
        if (isset(self::LEVEL_NAMES[$level])) {
            return self::LEVEL_NAMES[$level];
        }
        // If no specific name is found, return a default name
        return "Level " . $level;
    }
}
