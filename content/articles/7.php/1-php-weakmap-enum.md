---
title: "PHP – WeakMap & Enum"
description: "Utiliser les WeakMap et Enum en PHP moderne avec Laravel et Symfony"
icon: "i-mdi:language-php"
article_id: "1-php-weakmap-enum"
---

#### 📌 WeakMap & Enum en PHP

Depuis PHP 8.0 et 8.1, deux fonctionnalités puissantes ont rejoint le langage :
les **Enum** et les **WeakMap**. Souvent présentées séparément, elles forment un
duo particulièrement efficace dans les applications Laravel et Symfony modernes.

Pour illustrer leur usage, nous allons construire une **Todo List** complète —
avec statut typé par Enum, cache WeakMap, migrations, et tests.

---

#### 🧩 Les Enum

##### Qu'est-ce qu'un Enum ?

Avant PHP 8.1, simuler une énumération revenait à définir des constantes de classe :

```php
class TodoStatus
{
    const DONE     = 'done';
    const NOT_DONE = 'not_done';
}
```

Le problème : rien n'empêche de passer n'importe quelle chaîne là où un statut est
attendu. Le typage ne protège pas.

Depuis PHP 8.1, les Enum sont natifs :

```php
enum TodoStatus: string
{
    case Done    = 'done';
    case NotDone = 'not_done';
}
```

##### Pure Enum vs Backed Enum

| Type | Déclaration | Valeur | Usage |
|------|-------------|--------|-------|
| **Pure Enum** | `enum Status` | aucune | Comparaison, typage |
| **Backed Enum** | `enum Status: string` | `string` ou `int` | BDD, API, sérialisation |

##### Notre Enum TodoStatus

```php
// app/Enums/TodoStatus.php (Laravel)
// src/Enum/TodoStatus.php (Symfony)

enum TodoStatus: string
{
    case Done    = 'done';
    case NotDone = 'not_done';

    public function label(): string
    {
        return match($this) {
            TodoStatus::Done    => '✅ Terminée',
            TodoStatus::NotDone => '⏳ En attente',
        };
    }

    public function isDone(): bool
    {
        return $this === TodoStatus::Done;
    }

    public function toggle(): self
    {
        return match($this) {
            TodoStatus::Done    => TodoStatus::NotDone,
            TodoStatus::NotDone => TodoStatus::Done,
        };
    }
}
```

La méthode `toggle()` est particulièrement utile : elle permet de basculer le statut
sans aucune condition dans le code appelant.

---

#### 🧩 Les WeakMap

##### Qu'est-ce qu'une WeakMap ?

Une `WeakMap` est une structure de données qui associe des **objets** à des valeurs,
comme un tableau associatif — mais avec une différence fondamentale : les clés sont
des **références faibles**.

```php
$map = new WeakMap();
$obj = new stdClass();

$map[$obj] = 'une valeur';

// Si $obj est détruit, l'entrée disparaît automatiquement de la WeakMap
unset($obj);
// L'entrée n'existe plus dans $map — pas de fuite mémoire
```

##### WeakMap vs Array

| | `array` | `WeakMap` |
|---|---------|-----------|
| **Clés** | scalaires | objets uniquement |
| **Mémoire** | persiste jusqu'à suppression manuelle | libérée automatiquement avec l'objet |
| **Usage** | données générales | cache associé à des objets |
| **Itérable** | oui | oui |

##### WeakMap + Enum : le duo gagnant

Les Backed Enum sont des **objets** en PHP — ils peuvent donc servir de clés dans
une WeakMap :

```php
// Avec un tableau classique — on utilise ->value comme clé
$array = [];
$array[TodoStatus::Done->value] = ['count' => 0];

// Avec une WeakMap — on utilise l'Enum directement comme clé
$map = new WeakMap();
$map[TodoStatus::Done]    = ['count' => 0];
$map[TodoStatus::NotDone] = ['count' => 0];

echo $map[TodoStatus::Done]['count']; // 0
```

Plus besoin de manipuler `->value` comme clé — le typage est total.

---

#### 🗺️ Cycle de vie WeakMap vs Array

<mermaid>
graph TD
  subgraph ARR["🗃️ Array classique"]
    A1["Objet créé"] --> A2["Ajouté dans array"]
    A2 --> A3["Objet détruit"]
    A3 --> A4["❌ Entrée reste en mémoire\nfuite mémoire possible"]
  end
  subgraph WM["⚡ WeakMap"]
    W1["Objet créé"] --> W2["Ajouté dans WeakMap"]
    W2 --> W3["Objet détruit"]
    W3 --> W4["✅ Entrée supprimée automatiquement\naucune fuite mémoire"]
  end
  classDef cluster fill:#41dcce,stroke:#333,stroke-width:1.5px,rx:10,ry:10;
  classDef goodStyle fill:#dfd,stroke:#0d0,stroke-width:2px;
  classDef badStyle fill:#fdd,stroke:#d00,stroke-width:2px;
  classDef containerStyle fill:#ffd,stroke:#dd0,stroke-width:2px;
  class ARR,WM cluster;
  class A4 badStyle;
  class W4 goodStyle;
  class A1,A2,A3,W1,W2,W3 containerStyle;
</mermaid>

---

#### 🏗️ Application dans Laravel

##### Migration

```bash
php artisan make:migration create_todos_table
```

```php
// database/migrations/xxxx_create_todos_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('todos', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('description')->nullable();
            $table->string('status')->default(TodoStatus::NotDone->value);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('todos');
    }
};
```

```bash
php artisan migrate
```

##### Modèle

```php
// app/Models/Todo.php
namespace App\Models;

use App\Enums\TodoStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

class Todo extends Model
{
    protected $fillable = [
        'title',
        'description',
        'status',
    ];

    protected $casts = [
        'status' => TodoStatus::class,
    ];

    // Scopes
    public function scopeDone(Builder $query): Builder
    {
        return $query->where('status', TodoStatus::Done);
    }

    public function scopeNotDone(Builder $query): Builder
    {
        return $query->where('status', TodoStatus::NotDone);
    }

    // Helpers
    public function toggle(): self
    {
        $this->status = $this->status->toggle();
        return $this;
    }
}
```

##### Service avec WeakMap

```php
// app/Services/TodoStatsService.php
namespace App\Services;

use App\Enums\TodoStatus;
use App\Models\Todo;
use Illuminate\Support\Collection;

class TodoStatsService
{
    private WeakMap $cache;

    public function __construct()
    {
        $this->cache = new WeakMap();
    }

    /**
     * Calcule les statistiques d'une collection de todos.
     * Le résultat est mis en cache par référence d'objet — 
     * si la collection est détruite, le cache est libéré automatiquement.
     */
    public function getStats(Collection $todos): array
    {
        if (isset($this->cache[$todos])) {
            return $this->cache[$todos];
        }

        $stats = [
            TodoStatus::Done->value    => $todos->filter(
                fn(Todo $todo) => $todo->status->isDone()
            )->count(),
            TodoStatus::NotDone->value => $todos->filter(
                fn(Todo $todo) => !$todo->status->isDone()
            )->count(),
        ];

        $this->cache[$todos] = $stats;

        return $stats;
    }
}
```

##### Controller

```php
// app/Http/Controllers/TodoController.php
namespace App\Http\Controllers;

use App\Enums\TodoStatus;
use App\Http\Requests\StoreTodoRequest;
use App\Models\Todo;
use App\Services\TodoStatsService;

class TodoController extends Controller
{
    public function __construct(
        private TodoStatsService $statsService
    ) {}

    public function index()
    {
        $todos = Todo::orderBy('created_at', 'desc')->get();
        $stats = $this->statsService->getStats($todos);

        return view('todos.index', compact('todos', 'stats'));
    }

    public function store(StoreTodoRequest $request)
    {
        Todo::create([
            'title'       => $request->title,
            'description' => $request->description,
            'status'      => TodoStatus::NotDone,
        ]);

        return redirect()->route('todos.index');
    }

    public function toggle(Todo $todo)
    {
        $todo->toggle()->save();

        return redirect()->route('todos.index');
    }
}
```

##### Form Request

```php
// app/Http/Requests/StoreTodoRequest.php
namespace App\Http\Requests;

use App\Enums\TodoStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;

class StoreTodoRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'title'       => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status'      => ['sometimes', new Enum(TodoStatus::class)],
        ];
    }
}
```

##### Tests Laravel

```php
// tests/Unit/Enums/TodoStatusTest.php
namespace Tests\Unit\Enums;

use App\Enums\TodoStatus;
use PHPUnit\Framework\TestCase;

class TodoStatusTest extends TestCase
{
    public function test_label_returns_correct_string(): void
    {
        $this->assertSame('✅ Terminée',  TodoStatus::Done->label());
        $this->assertSame('⏳ En attente', TodoStatus::NotDone->label());
    }

    public function test_is_done(): void
    {
        $this->assertTrue(TodoStatus::Done->isDone());
        $this->assertFalse(TodoStatus::NotDone->isDone());
    }

    public function test_toggle(): void
    {
        $this->assertSame(TodoStatus::NotDone, TodoStatus::Done->toggle());
        $this->assertSame(TodoStatus::Done,    TodoStatus::NotDone->toggle());
    }

    public function test_from_value(): void
    {
        $this->assertSame(TodoStatus::Done,    TodoStatus::from('done'));
        $this->assertSame(TodoStatus::NotDone, TodoStatus::from('not_done'));
    }

    public function test_try_from_unknown_value_returns_null(): void
    {
        $this->assertNull(TodoStatus::tryFrom('unknown'));
    }
}
```

```php
// tests/Unit/Services/TodoStatsServiceTest.php
namespace Tests\Unit\Services;

use App\Enums\TodoStatus;
use App\Models\Todo;
use App\Services\TodoStatsService;
use Illuminate\Support\Collection;
use Tests\TestCase;

class TodoStatsServiceTest extends TestCase
{
    private TodoStatsService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new TodoStatsService();
    }

    public function test_stats_counts_done_and_not_done(): void
    {
        $todos = new Collection([
            $this->makeTodo(TodoStatus::Done),
            $this->makeTodo(TodoStatus::Done),
            $this->makeTodo(TodoStatus::NotDone),
        ]);

        $stats = $this->service->getStats($todos);

        $this->assertSame(2, $stats[TodoStatus::Done->value]);
        $this->assertSame(1, $stats[TodoStatus::NotDone->value]);
    }

    public function test_stats_are_cached_for_same_collection(): void
    {
        $todos = new Collection([
            $this->makeTodo(TodoStatus::Done),
        ]);

        $stats1 = $this->service->getStats($todos);
        $stats2 = $this->service->getStats($todos);

        $this->assertSame($stats1, $stats2);
    }

    public function test_cache_is_freed_when_collection_is_destroyed(): void
    {
        $service = new TodoStatsService();
        $weakMap = new \ReflectionProperty($service, 'cache');
        $weakMap->setAccessible(true);

        $todos = new Collection([$this->makeTodo(TodoStatus::Done)]);
        $service->getStats($todos);

        $this->assertCount(1, $weakMap->getValue($service));

        unset($todos);

        $this->assertCount(0, $weakMap->getValue($service));
    }

    public function test_feature_toggle_todo(): void
    {
        $todo = Todo::factory()->create(['status' => TodoStatus::NotDone]);

        $this->patch(route('todos.toggle', $todo));

        $this->assertSame(
            TodoStatus::Done,
            $todo->fresh()->status
        );
    }

    private function makeTodo(TodoStatus $status): Todo
    {
        $todo = new Todo();
        $todo->status = $status;
        return $todo;
    }
}
```

```bash
php artisan test --filter TodoStatus
php artisan test --filter TodoStatsService
```

---

#### 🏗️ Application dans Symfony

##### Migration Doctrine

```bash
php bin/console make:entity Todo
php bin/console make:migration
php bin/console doctrine:migrations:migrate
```

```php
// src/Entity/Todo.php
namespace App\Entity;

use App\Enum\TodoStatus;
use App\Repository\TodoRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: TodoRepository::class)]
class Todo
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private string $title;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $description = null;

    #[ORM\Column(
        type: 'string',
        enumType: TodoStatus::class,
        options: ['default' => 'not_done']
    )]
    private TodoStatus $status = TodoStatus::NotDone;

    public function toggle(): self
    {
        $this->status = $this->status->toggle();
        return $this;
    }

    // Getters / Setters...
}
```

##### Repository avec WeakMap

```php
// src/Repository/TodoRepository.php
namespace App\Repository;

use App\Entity\Todo;
use App\Enum\TodoStatus;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class TodoRepository extends ServiceEntityRepository
{
    private WeakMap $statsCache;

    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Todo::class);
        $this->statsCache = new WeakMap();
    }

    public function findByStatus(TodoStatus $status): array
    {
        return $this->createQueryBuilder('t')
            ->where('t.status = :status')
            ->setParameter('status', $status->value)
            ->getQuery()
            ->getResult();
    }

    /**
     * Cache les stats par instance de Todo — libéré automatiquement
     * quand l'objet sort du scope.
     */
    public function getStatsForTodo(Todo $todo): array
    {
        if (isset($this->statsCache[$todo])) {
            return $this->statsCache[$todo];
        }

        $stats = [
            'status'  => $todo->getStatus()->label(),
            'is_done' => $todo->getStatus()->isDone(),
        ];

        $this->statsCache[$todo] = $stats;

        return $stats;
    }
}
```

##### Tests Symfony

```php
// tests/Unit/Enum/TodoStatusTest.php
namespace App\Tests\Unit\Enum;

use App\Enum\TodoStatus;
use PHPUnit\Framework\TestCase;

class TodoStatusTest extends TestCase
{
    public function test_label(): void
    {
        $this->assertSame('✅ Terminée',  TodoStatus::Done->label());
        $this->assertSame('⏳ En attente', TodoStatus::NotDone->label());
    }

    public function test_toggle(): void
    {
        $this->assertSame(TodoStatus::NotDone, TodoStatus::Done->toggle());
        $this->assertSame(TodoStatus::Done,    TodoStatus::NotDone->toggle());
    }

    public function test_is_done(): void
    {
        $this->assertTrue(TodoStatus::Done->isDone());
        $this->assertFalse(TodoStatus::NotDone->isDone());
    }
}
```

```php
// tests/Unit/Repository/TodoRepositoryTest.php
namespace App\Tests\Unit\Repository;

use App\Entity\Todo;
use App\Enum\TodoStatus;
use App\Repository\TodoRepository;
use PHPUnit\Framework\TestCase;

class TodoRepositoryTest extends TestCase
{
    public function test_weakmap_cache_is_freed_on_object_destruction(): void
    {
        $repository = $this->createMock(TodoRepository::class);
        $cache      = new \WeakMap();

        $todo         = new Todo();
        $cache[$todo] = ['status' => 'done'];

        $this->assertCount(1, $cache);

        unset($todo);

        $this->assertCount(0, $cache);
    }
}
```

```bash
php bin/phpunit tests/Unit/Enum/TodoStatusTest.php
php bin/phpunit tests/Unit/Repository/TodoRepositoryTest.php
```

---

#### 🎯 Quand utiliser quoi ?

| Situation | Solution recommandée |
|-----------|---------------------|
| Remplacer des constantes de classe | Enum |
| Typer les colonnes de BDD | Backed Enum (`string` ou `int`) |
| Gérer des statuts métier | Backed Enum avec méthodes |
| Cache associé à des objets | WeakMap |
| Éviter les doublons dans un batch | WeakMap |
| Associer des données à des Enum | WeakMap avec Enum comme clé |
| Validation de formulaire | Enum + règle de validation native |

---

#### ✅ Conclusion

Les Enum apportent un typage fort là où les constantes de classe laissaient passer
des erreurs silencieuses. Les WeakMap offrent un cache léger et sans fuite mémoire,
idéal pour les traitements sur des objets. Ensemble, ils permettent d'écrire un code
plus expressif, plus sûr et plus efficace dans Laravel comme dans Symfony.

---

::right-note
Cet article a été rédigé avec l'assistance de [Claude](https://claude.ai){:target="_blank"}, IA développée par Anthropic.
::