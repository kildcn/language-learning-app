<?php
// app/Policies/ParagraphPolicy.php
namespace App\Policies;

use App\Models\Paragraph;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ParagraphPolicy
{
    use HandlesAuthorization;

    public function view(User $user, Paragraph $paragraph)
    {
        // Allow viewing paragraphs that don't belong to a user
        // or belong to the current user
        return $paragraph->user_id === null || $paragraph->user_id === $user->id;
    }

    public function update(User $user, Paragraph $paragraph)
    {
        return $paragraph->user_id === $user->id;
    }

    public function delete(User $user, Paragraph $paragraph)
    {
        return $paragraph->user_id === $user->id;
    }
}
