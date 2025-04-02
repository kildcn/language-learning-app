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
        // Create the migration file with a timestamp
        $timestamp = date('Y_m_d_His');
        $migrationName = "{$timestamp}_add_category_to_saved_words_table.php";

        Schema::table('saved_words', function (Blueprint $table) {
            $table->string('category')->nullable()->after('paragraph_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('saved_words', function (Blueprint $table) {
            $table->dropColumn('category');
        });
    }
};
