# Rockfall (ZX Spectrum) — Modern WebGL Remaster

[![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![WebGL 2.0](https://img.shields.io/badge/WebGL-2.0-990000?logo=webgl&logoColor=white)](https://www.khronos.org/webgl/)
[![Web Audio API](https://img.shields.io/badge/Web%20Audio%20API-Synthesized-4B0082)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
[![Zero Runtime Dependencies](https://img.shields.io/badge/Dependencies-0-brightgreen)](#)
[![ZX Spectrum](https://img.shields.io/badge/ZX%20Spectrum-1985%20Original-red)](#)
[![License](https://img.shields.io/badge/License-Educational%20%2F%20MIT-blue)](#-правовая-информация-и-отказ-от-ответственности--legal-disclaimer)

Современный веб-ремастер культовой игры **Rockfall** для платформы **ZX Spectrum** (1985, автор оригинальной игры — Иэн Коллиер / *Ian Collier*). 

Проект представляет собой точную реконструкцию игры на технологиях современного веба (WebGL 2.0, HTML5 Canvas 2D, Web Audio API), созданную на основе глубокого реверс-инжиниринга оригинального машинного кода Z80 и извлечения ресурсов из образа дискеты TR-DOS (`ROCKFLDK.SCL`).

---

## 🎮 Быстрый запуск

### Вариант 1. Автономный оффлайн-файл (Без установки)
Просто откройте файл [`dist/rockfall.html`](dist/rockfall.html) в любом современном веб-браузере (Chrome, Firefox, Safari, Edge). Игра упакована в единый файл размером ~270 КБ, не требует интернета или локального сервера и работает даже через протокол `file://`.

### Вариант 2. Локальный сервер разработки
Для запуска модульной версии (`src/`):

```bash
# Клонируйте репозиторий
git clone https://github.com/<ваш-аккаунт>/Rockfall.git
cd Rockfall

# Запуск через встроенный Python-сервер
npm start
# или напрямую:
python3 tools/server.py
```

После запуска откройте в браузере: [http://localhost:3000](http://localhost:3000).

---

## ✨ Ключевые особенности

- **🎯 100% аутентичная физика Z80:**
  Механика движения камней, скольжения по закругленным поверхностям, сбор алмазов, алгоритм расширения амёбы, поведение врагов (бабочки/светлячки) и их детонация в алмазы воссозданы байт-в-байт по дизассемблированному коду Z80 (`disasm/rockfall_engine.asm`).
- **🗺️ Все 28 оригинальных уровней:**
  Карты уровней и таблицы требуемого количества драгоценностей извлечены непосредственно из системной памяти дисковой версии Spectrum.
- **🎨 Двойной графический движок (WebGL 2.0 + Canvas 2D):**
  - **Classic Spectrum Mode:** оригинальная палитра ZX Spectrum с атрибутами знакомест (INK, PAPER, BRIGHT, FLASH) и пиксельной сеткой 16×16.
  - **Modern HD Mode:** процедурные текстуры высокого разрешения, объёмное освещение драгоценностей, анимированные спрайты и динамические эффекты.
  - **CRT Shader:** кинескопный фильтр с эмуляцией сканлайнов, кривизны экрана, свечения люминофора и виньетирования.
- **🔊 Процедурный синтезатор звука (Web Audio API):**
  Полный набор аутентичных звуковых эффектов (шаги, копание земли, падение камней, звон алмазов, взрывы, открытие портала) генерируется процедурно в реальном времени. В проекте нет внешних `.mp3` или `.wav` файлов.
- **📱 Поддержка мобильных устройств:**
  Адаптивный интерфейс с экранным аркадным D-pad для смартфонов и планшетов.
- **💾 Сохранение прогресса:**
  Автоматическое сохранение выбранного уровня, очков и настроек графики/звука в `localStorage`.

---

## 🕹️ Управление

| Действие | Клавиатура | Мобильные устройства |
| :--- | :--- | :--- |
| **Движение** | Стрелки `▲` `▼` `◀` `▶` или `W` `A` `S` `D` | Экранный D-Pad |
| **Быстрый перезапуск уровня** | Клавиша `R` или `Esc` | Кнопка `↺ RESET [R]` на верхней панели |
| **Переключение графики (Classic / HD)** | Клик по кнопке `MODE` на тулбаре | Кнопка `MODE` |
| **CRT-фильтр (Сканлайны)** | Клик по кнопке `CRT` на тулбаре | Кнопка `CRT` |
| **Звук (Вкл / Выкл)** | Клик по кнопке `AUDIO` на тулбаре | Кнопка `AUDIO` |
| **Выбор уровня** | Выпадающий список `LEVEL` | Выпадающий список `LEVEL` |
| **Скорость игры** | Ползунок `SPEED` | Ползунок `SPEED` |

---

## 🛠️ Сборка и инструменты

В проекте используются лёгкие Python- и Node-утилиты без внешних npm-пакетов:

- **Запуск тестов физики и валидации уровней:**
  ```bash
  npm test
  # Проверяет структуру всех 28 уровней и моделирует 20 тиков физического движка
  ```

- **Сборка единого оффлайн-файла:**
  ```bash
  npm run build
  # Упаковывает HTML, стили, шейдеры, звуковой синтезатор, спрайты и уровни в dist/rockfall.html
  ```

- **Реверс-инжиниринг и распаковка оригинального образа:**
  ```bash
  python3 tools/unpack_scl.py
  # Извлекает из дискеты ROCKFLDK.SCL спрайты в assets/sprites.json и уровни в assets/levels.json
  ```

---

## 📁 Структура репозитория

```text
Rockfall/
├── assets/                  # Извлечённые данные игры
│   ├── levels.json          # Геометрия и параметры всех 28 уровней
│   └── sprites.json         # Битовые матрицы 32 оригинальных спрайтов 16x16
├── disasm/                  # Материалы реверс-инжиниринга
│   └── rockfall_engine.asm  # Дизассемблированный код оригинального Z80-движка
├── dist/                    # Готовые сборки
│   └── rockfall.html        # Автономный однофайловый дистрибутив (~270 KB)
├── src/                     # Исходный код движка
│   ├── audio/               # Синтезатор звука на Web Audio API
│   ├── engine/              # Физика, сущности, логика игры, сохранение
│   ├── renderer/            # WebGL 2.0 шейдеры, Canvas 2D, атласы спрайтов
│   ├── ui/                  # HUD, оверлеи и контроллеры
│   └── main.js              # Точка входа приложения
├── test/                    # Автоматизированные тесты уровней и физики
├── tools/                   # Инструменты сборки, распаковки и отладки
├── index.html               # Основной веб-интерфейс игры
├── style.css                # Ретро-стили интерфейса и HUD
├── ROCKFLDK.SCL             # Аутентичный образ дискеты TR-DOS (для верификации)
└── package.json             # Конфигурация скриптов запуска и тестирования
```

---

## ⚖️ Правовая информация и отказ от ответственности / Legal Disclaimer

### Русский язык

> ### ВАЖНОЕ ПРАВОВОЕ УВЕДОМЛЕНИЕ:
>
> 1. **Образовательный и некоммерческий статус:**  
>    Настоящий проект разработан **исключительно в образовательных, учебных и исследовательских целях** (в рамках добросовестного использования / *fair use*). Он предназначен для демонстрации возможностей современных веб-технологий (WebGL 2.0, Web Audio API), изучения архитектуры Z80, методик реверс-инжиниринга ретро-видеоигр и сохранения исторического программного наследия.
>
> 2. **Принадлежность авторских прав и товарных знаков:**  
>    - Все исключительные авторские права, дизайн, графика, дизайн уровней и механики оригинальной игры **Rockfall (1985)** принадлежат их первоначальному автору — **Иэну Коллиеру (Ian Collier)**.
>    - Концепция, базовая игровая механика и товарные знаки линейки игр **Boulder Dash** являются зарегистрированной интеллектуальной собственностью и принадлежат их законным правообладателям (**Peter Liepa**, **Chris Gray**, а также компании **BBG Entertainment GmbH** / First Star Software).
>    - Товарный знак **ZX Spectrum** является собственностью его законного владельца (Amstrad / Sky Group).
>
> 3. **Отсутствие претензий и коммерческой выгоды:**  
>    Автор настоящего проекта **не претендует ни на какие авторские права, товарные знаки, логотипы, наименования или иную интеллектуальную собственность оригинальных авторов и правообладателей**. Проект распространяется на безвозмездной основе, не содержит рекламы, платежей, донатов или иных средств коммерциализации.
>
> 4. **Удаление материалов (Takedown Policy):**  
>    Если вы являетесь законным правообладателем каких-либо материалов, представленных в данном репозитории, и возражаете против их присутствия в образовательном проекте, пожалуйста, создайте обращение в разделе [Issues](../../issues) или свяжитесь с автором репозитория напрямую. Материалы будут незамедлительно удалены по первому запросу.
>
> 5. **Лицензия на исходный код ремастера:**  
>    Собственный оригинальный программный код ремастера (WebGL-шейдеры, архитектура рендерера, реализация синтезатора Web Audio API и скрипты упаковки) распространяется под лицензией [MIT](https://opensource.org/licenses/MIT). Данная лицензия распространяется исключительно на добавленный код реализации и **не наделяет никакими правами** на исходную интеллектуальную собственность оригинальной игры Rockfall.

---

### English Version

> ### IMPORTANT LEGAL NOTICE & DISCLAIMER:
>
> 1. **Educational & Non-Commercial Purpose:**  
>    This repository is an independent, non-commercial fan-made project created strictly for **educational, historical preservation, and research purposes** under Fair Use doctrine. Its sole objectives are the academic exploration of Z80 reverse-engineering, procedural audio synthesis via the Web Audio API, and high-performance 2D rendering using WebGL 2.0.
>
> 2. **Intellectual Property & Trademarks:**  
>    - All copyrights, design assets, levels, sound design, and intellectual property associated with the original game **Rockfall (1985)** belong exclusively to their original creator, **Ian Collier**.
>    - The core gameplay concept, design lineage, and registered trademarks for **Boulder Dash** belong to their respective copyright and trademark owners (**Peter Liepa**, **Chris Gray**, and **BBG Entertainment GmbH** / First Star Software).
>    - The **ZX Spectrum** trademark is the property of its respective owner (Amstrad / Sky Group).
>
> 3. **No Claim of Rights & No Monetization:**  
>    The creator of this repository makes **no claims of ownership, trademark, or copyright** over the original game, its title, graphics, characters, or game design. This project is provided entirely free of charge, with zero commercial intent, zero monetization, and no advertisements.
>
> 4. **Notice and Takedown Policy:**  
>    If you are an intellectual property holder and believe that any content in this repository infringes upon your rights, please open an issue in the [Issues](../../issues) tab or contact the repository maintainer directly. Any contested material will be promptly reviewed and removed upon notification.
>
> 5. **Code License:**  
>    The new, original source code written specifically for this browser implementation (WebGL shaders, Canvas fallback, procedural audio oscillators, and build tooling) is provided under the [MIT License](https://opensource.org/licenses/MIT). This license applies only to the new implementation code and explicitly does **not** grant any rights to the underlying original intellectual property or original game assets.

---

## 👏 Благодарности (Credits)

- **Ian Collier** — за создание шедевральной игры *Rockfall* для ZX Spectrum в 1985 году.
- **Peter Liepa & Chris Gray** — создателям оригинальной концепции *Boulder Dash* (1984), вдохновившей целое поколение разработчиков.
- Сообществу энтузиастов и исследователей ретро-компьютеров платформы **ZX Spectrum**.
