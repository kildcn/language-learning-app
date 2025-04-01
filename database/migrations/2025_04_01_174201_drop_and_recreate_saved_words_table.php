<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Drop the saved_words table
        Schema::dropIfExists('saved_words');

        // Recreate the saved_words table with the same structure
        Schema::create('saved_words', function (Blueprint $table) {
            $table->id();
            $table->string('word');
            $table->text('context')->nullable(); // Sentence where the word was found
            $table->text('definition')->nullable();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('paragraph_id')->nullable()->constrained()->onDelete('set null');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // In the down method, we would typically recreate the table with its original structure,
        // but since this is a specific operation to fix data, we'll just ensure the table exists
        if (!Schema::hasTable('saved_words')) {
            Schema::create('saved_words', function (Blueprint $table) {
                $table->id();
                $table->string('word');
                $table->text('context')->nullable();
                $table->text('definition')->nullable();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->foreignId('paragraph_id')->nullable()->constrained()->onDelete('set null');
                $table->timestamps();
            });
        }
    }
};
