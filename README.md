# German Language Learning App 🇩🇪

A comprehensive web application designed to help users learn German through interactive text reading, vocabulary building, and quiz-based practice. Built with Laravel (backend) and React (frontend).

## 🚀 Features

### 📖 German Text Generation & Reading
- Generate German texts at different proficiency levels (A2, B1, B2, C1)
- AI-powered content creation with customizable topics
- Interactive text reading with word selection and saving
- Text-to-speech pronunciation support

### 📚 Vocabulary Management
- Save German words while reading texts
- Automatic translation and definition generation
- Categorized vocabulary organization
- Built-in dictionary integration (PONS, dict.cc, Linguee, etc.)
- Bulk vocabulary import by category
- Custom definition editing

### 🎯 Interactive Quizzes
- Multiple choice and matching quiz formats
- Create quizzes from saved vocabulary
- Flexible quiz generation (recent words, random selection, custom selection)
- Progress tracking and attempt history
- Difficulty-based word filtering

### 📊 Progress Tracking
- Comprehensive leveling system with unique German-themed level names
- Points-based progression (vocabulary, quiz performance, text reading)
- Visual progress indicators and achievements
- Detailed learning statistics

### 🎨 User Experience
- Clean, modern Material-UI interface
- Responsive design for desktop and mobile
- Dark/light theme support
- Pronunciation support with German text-to-speech
- Real-time search and filtering

## 🛠️ Tech Stack

### Backend
- **Laravel 12** - PHP framework
- **Laravel Sanctum** - API authentication
- **SQLite/MySQL** - Database
- **Hugging Face API** - AI text generation and translation
- **Spatie** packages for enhanced functionality

### Frontend
- **React 18** - UI framework
- **Material-UI** - Component library
- **TypeScript** - Type safety
- **Axios** - HTTP client
- **React Router** - Navigation

## 📋 Prerequisites

- PHP 8.2+
- Node.js 18+
- Composer
- SQLite or MySQL

## ⚡ Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd german-learning-app
```

### 2. Backend Setup
```bash
# Install PHP dependencies
composer install

# Copy environment file
cp .env.example .env

# Generate application key
php artisan key:generate

# Configure database (SQLite is default)
touch database/database.sqlite

# Run migrations and seed default data
php artisan migrate --seed

# Start the Laravel development server
php artisan serve
```

### 3. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
npm start
```

### 4. Access the Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# App Configuration
APP_NAME="German Language Learning App"
APP_ENV=local
APP_KEY=base64:YOUR_APP_KEY
APP_DEBUG=true
APP_URL=http://localhost:8000

# Database
DB_CONNECTION=sqlite
DB_DATABASE=/absolute/path/to/database/database.sqlite

# API Keys (Optional but recommended)
HUGGINGFACE_API_KEY=your_huggingface_api_key

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Session & Cache
SESSION_DRIVER=database
CACHE_STORE=database
QUEUE_CONNECTION=database
```

### API Configuration

#### Hugging Face API (Recommended)
1. Sign up at [Hugging Face](https://huggingface.co/)
2. Get your API key from your profile settings
3. Add it to your `.env` file as `HUGGINGFACE_API_KEY`

Note: The app includes fallback content generation if no API key is provided.

## 🎮 Usage Guide

### Getting Started
1. **Register/Login**: Create an account or log in
2. **Dashboard**: View your learning progress and quick stats
3. **Generate Text**: Create German reading material at your level
4. **Save Words**: Click on words while reading to save them
5. **Create Quizzes**: Test your vocabulary knowledge
6. **Track Progress**: Watch your level increase as you learn

### Learning Workflow
1. **Generate a German text** at your proficiency level
2. **Read and save unknown words** by clicking on them
3. **Create quizzes** from your saved vocabulary
4. **Practice regularly** to improve your scores and level up
5. **Explore categories** to learn themed vocabulary

### Quiz Types
- **Multiple Choice**: Select the correct translation from 4 options
- **Matching**: Match German words with their English translations

### Vocabulary Categories
The app includes pre-built vocabulary in categories like:
- Family & Relationships
- Food & Drink
- Travel & Transportation
- Work & Career
- And many more...

## 🔧 Development

### Running Tests
```bash
# Backend tests
php artisan test

# Frontend tests
cd frontend && npm test
```

### Code Style
```bash
# PHP CS Fixer
./vendor/bin/pint

# Frontend linting
cd frontend && npm run lint
```

### Database Commands
```bash
# Fresh migration with seeding
php artisan migrate:fresh --seed

# Add default vocabulary to existing users
php artisan app:update-users --vocabulary
```

## 📁 Project Structure

```
├── app/                    # Laravel application code
│   ├── Http/Controllers/   # API controllers
│   ├── Models/            # Eloquent models
│   ├── Services/          # Business logic services
│   └── Policies/          # Authorization policies
├── database/
│   ├── migrations/        # Database migrations
│   └── seeders/          # Database seeders
├── frontend/              # React application
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/        # Page components
│   │   ├── contexts/     # React contexts
│   │   └── services/     # API services
└── routes/api.php        # API routes
```

## 🎯 Learning Features

### Proficiency Levels
- **A2 (Elementary)**: Basic everyday expressions
- **B1 (Intermediate)**: Common situations and topics
- **B2 (Upper Intermediate)**: Complex texts and abstract topics
- **C1 (Advanced)**: Sophisticated language use

### Progress System
- Earn points for vocabulary, quiz performance, and reading
- Unlock unique German-themed achievements
- Visual progress tracking with detailed statistics

### Dictionary Integration
- Multiple dictionary sources (PONS, dict.cc, Linguee)
- Fallback options when automatic translation fails
- Context-aware word definitions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 API Documentation

### Authentication
All API routes (except login/register) require authentication via Laravel Sanctum tokens.

### Key Endpoints
- `POST /api/register` - User registration
- `POST /api/login` - User login
- `GET /api/paragraphs` - Get German texts
- `POST /api/paragraphs` - Generate new text
- `GET /api/saved-words` - Get saved vocabulary
- `POST /api/quizzes` - Create a quiz
- `GET /api/user/progress` - Get user progress

## 🐛 Troubleshooting

### Common Issues

**Database Issues**
```bash
# Reset database
php artisan migrate:fresh --seed
```

**CORS Issues**
- Ensure `FRONTEND_URL` is set correctly in `.env`
- Check Laravel CORS middleware configuration

**Translation Issues**
- Verify Hugging Face API key
- Check API rate limits
- Use dictionary search as fallback

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Laravel community for the excellent framework
- Material-UI team for the component library
- Hugging Face for AI language models
- Dictionary providers (PONS, dict.cc, Linguee) for language resources

---

**Happy German Learning! Viel Erfolg beim Deutschlernen! 🎓**
