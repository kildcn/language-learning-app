<?php

namespace App\Listeners;

use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Database\Seeders\DefaultVocabularySeeder;

class UserCreatedListener implements ShouldQueue
{
    use InteractsWithQueue;

    protected $vocabularySeeder;

    /**
     * Create the event listener.
     */
    public function __construct(DefaultVocabularySeeder $vocabularySeeder)
    {
        $this->vocabularySeeder = $vocabularySeeder;
    }

    /**
     * Handle the event.
     */
    public function handle(Registered $event): void
    {
        // Get the newly registered user
        $user = $event->user;

        // Add default vocabulary words to the user
        $this->vocabularySeeder->addDefaultWordsToUser($user);
    }
}
