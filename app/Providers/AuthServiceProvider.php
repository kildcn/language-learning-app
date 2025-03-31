<?php
// app/Providers/AuthServiceProvider.php
namespace App\Providers;

use App\Models\Paragraph;
use App\Models\Quiz;
use App\Models\SavedWord;
use App\Policies\ParagraphPolicy;
use App\Policies\QuizPolicy;
use App\Policies\SavedWordPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        Paragraph::class => ParagraphPolicy::class,
        SavedWord::class => SavedWordPolicy::class,
        Quiz::class => QuizPolicy::class,
    ];

    /**
     * Register any authentication / authorization services.
     */
    public function boot(): void
    {
        $this->registerPolicies();
    }
}
