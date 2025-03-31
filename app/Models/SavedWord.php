<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SavedWord extends Model
{
    use HasFactory;

    protected $fillable = [
        'word',
        'context',
        'definition',
        'user_id',
        'paragraph_id',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function paragraph()
    {
        return $this->belongsTo(Paragraph::class);
    }
}
