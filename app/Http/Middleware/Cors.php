<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class Cors
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        return $next($request)
            ->header('Access-Control-Allow-Origin', 'http://localhost:3000')
            ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
            ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    }
}

// Register the middleware in app/Http/Kernel.php
// Add this to the $middleware array
\App\Http\Middleware\Cors::class,

// Setup for deployment to production
// Create a build script in package.json of your Laravel app
"scripts": {
    "dev": "vite",
    "build": "vite build",
    "build-frontend": "cd frontend && npm install && npm run build && cp -r build/* ../public/"
}
