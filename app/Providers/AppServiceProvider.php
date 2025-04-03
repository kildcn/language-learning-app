<?php

namespace App\Providers;

use App\Services\OpenAIService;
use App\Services\VocabularyService;
use App\Services\ProgressService;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Register the OpenAIService as a singleton
        $this->app->singleton(OpenAIService::class, function ($app) {
            return new OpenAIService();
        });

        // Register the VocabularyService as a singleton
        $this->app->singleton(VocabularyService::class, function ($app) {
            return new VocabularyService();
        });

        // Register the ProgressService as a singleton
        $this->app->singleton(ProgressService::class, function ($app) {
            return new ProgressService();
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
