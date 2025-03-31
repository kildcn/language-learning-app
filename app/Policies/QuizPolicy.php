<?php

namespace App\Policies;

use App\Models\Quiz;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class QuizPolicy
{
    use HandlesAuthorization;

    public function view(User $user, Quiz $quiz)
    {
        return $quiz->user_id === $user->id;
    }

    public function update(User $user, Quiz $quiz)
    {
        return $quiz->user_id === $user->id;
    }

    public function delete(User $user, Quiz $quiz)
    {
        return $quiz->user_id === $user->id;
    }
}
