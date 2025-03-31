<?php
// database/migrations/xxxx_xx_xx_create_paragraphs_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('paragraphs', function (Blueprint $table) {
            $table->id();
            $table->text('content');
            $table->enum('level', ['A2', 'B1', 'B2', 'C1']);
            $table->string('title')->nullable();
            $table->string('topic')->nullable();
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('cascade');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('paragraphs');
    }
};
