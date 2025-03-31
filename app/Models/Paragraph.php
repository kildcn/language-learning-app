<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Paragraph extends Model
{
    use HasFactory;

    protected $fillable = [
        'content',
        'level',
        'title',
        'topic',
        'user_id',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function savedWords()
    {
        return $this->hasMany(SavedWord::class);
    }
}
