<?php

namespace App\Policies;

use App\Models\SavedWord;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class SavedWordPolicy
{
    use HandlesAuthorization;

    public function view(User $user, SavedWord $savedWord)
    {
        return $savedWord->user_id === $user->id;
    }

    public function update(User $user, SavedWord $savedWord)
    {
        return $savedWord->user_id === $user->id;
    }

    public function delete(User $user, SavedWord $savedWord)
    {
        return $savedWord->user_id === $user->id;
    }
}
