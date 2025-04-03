<?php

namespace App\Console\Commands;

use App\Models\User;
use Database\Seeders\DefaultVocabularySeeder;
use Illuminate\Console\Command;

class UpdateUsersCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:update-users {--vocabulary : Add default vocabulary to all users}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Update existing users with new features';

    /**
     * Execute the console command.
     */
    public function handle(DefaultVocabularySeeder $vocabularySeeder)
    {
        if ($this->option('vocabulary')) {
            $this->updateDefaultVocabulary($vocabularySeeder);
        } else {
            $this->info('Please specify what to update with one of the available options:');
            $this->line('  --vocabulary   Add default vocabulary to all users');
        }
    }

    /**
     * Add default vocabulary to all users
     */
    private function updateDefaultVocabulary(DefaultVocabularySeeder $vocabularySeeder)
    {
        $users = User::all();
        $count = $users->count();

        $this->info("Adding default vocabulary to {$count} users...");

        $bar = $this->output->createProgressBar($count);
        $bar->start();

        foreach ($users as $user) {
            $vocabularySeeder->addDefaultWordsToUser($user);
            $bar->advance();
        }

        $bar->finish();
        $this->newLine(2);
        $this->info('Default vocabulary added to all users successfully!');
    }
}
