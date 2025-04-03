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
        1, 10, 25, 50, 75, 100, 150, 200, 250,
        300, 350, 400, 450, 500, 550, 600, 650, 700,
        750, 800, 850, 900, 950, 999
    ];

    // CEFR equivalents for reference (approximate)
    const CEFR_RANGES = [
        'A1' => [1, 99],      // Complete beginner
        'A2' => [100, 249],   // Elementary
        'B1' => [250, 499],   // Intermediate
        'B2' => [500, 749],   // Upper Intermediate
        'C1' => [750, 950],   // Advanced
        'C2' => [951, 999]    // Mastery
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

        // Calculate percentage progress to next level
        $previousLevelThreshold = $this->getPreviousLevelThreshold($currentLevel);
        $pointsForCurrentLevel = $points - $previousLevelThreshold;
        $pointsNeededForNextLevel = $nextLevelThreshold - $previousLevelThreshold;

        $percentageToNextLevel = 0;
        if ($pointsNeededForNextLevel > 0) {
            $percentageToNextLevel = min(100, round(($pointsForCurrentLevel / $pointsNeededForNextLevel) * 100));
        }

        // Map the numerical level to CEFR equivalent for reference
        $cefrLevel = $this->mapToCEFR($currentLevel);

        return [
            'level' => $currentLevel,
            'cefr_equivalent' => $cefrLevel,
            'points' => $points,
            'next_level' => min(999, $currentLevel + 1),
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
     * Map the numerical level to CEFR level
     *
     * @param int $level
     * @return string
     */
    private function mapToCEFR(int $level): string
    {
        foreach (self::CEFR_RANGES as $cefrLevel => $range) {
            if ($level >= $range[0] && $level <= $range[1]) {
                return $cefrLevel;
            }
        }

        return 'A1'; // Default to A1 if no match
    }
}
