# YM Track Collector

A small console script for collecting tracks from **Yandex Music playlists**.

Yandex Music uses virtualized lists: not every track is present in the page DOM at once. Open a playlist, run the script in DevTools Console, scroll through the playlist, and export the collected tracks to TXT or CSV.

Tool by **idaniil24**.

---

## English

### Features

- Collects tracks from Yandex Music playlists
- Works with virtualized lists and lazy-loaded rows
- Watches both scroll events and DOM updates
- Exports tracks to TXT
- Exports tracks to CSV with `Artist,Title,Duration`
- Can be pasted directly into DevTools Console

### How to Use

1. Open a playlist on **Yandex Music**.
2. Open **DevTools**.

```text
F12 -> Console
```

3. Open `ym-track-collector.js`.
4. Copy the entire script and paste it into the Console.
5. Press **Enter**.
6. Scroll the playlist until the needed tracks have appeared.
7. Press **Finalize capture**.
8. Download the result as `.txt` or `.csv`.

### Output Formats

TXT:

```text
Artist - Title
```

CSV:

```csv
Artist,Title,Duration
```

---

## Русская Версия

### Описание

Скрипт для сбора треков из **плейлистов Яндекс Музыки** через DevTools Console.

Сайт Яндекс Музыки использует виртуализированные списки: не все треки находятся в DOM одновременно. Поэтому нужно запустить скрипт, пролистать плейлист и затем скачать собранный список.

### Возможности

- Собирает треки из плейлистов Яндекс Музыки
- Работает с виртуализированными и лениво подгружаемыми списками
- Отслеживает прокрутку и изменения DOM
- Экспортирует треки в TXT
- Экспортирует треки в CSV с колонками `Artist,Title,Duration`
- Не требует установки расширений

### Как Использовать

1. Откройте плейлист в **Яндекс Музыке**.
2. Откройте **DevTools**.

```text
F12 -> Console
```

3. Откройте файл `ym-track-collector.js`.
4. Скопируйте весь код.
5. Вставьте его в **Console**.
6. Нажмите **Enter**.
7. Пролистайте плейлист до нужного места или до конца.
8. Нажмите **Finalize capture**.
9. Скачайте список треков в `.txt` или `.csv`.

### Форматы

TXT:

```text
Исполнитель - Название
```

CSV:

```csv
Artist,Title,Duration
```

---

## Support the Project

If this tool helped you, consider supporting development.

### Crypto Donations

**TON**

```text
UQDUoyQkq99JbeA7lFRivIaCzsNxSowntmTnlRAu8fDU0qvi
```

**ETH (ERC20)**

```text
0x211b376c20c67942a95ba235aef8611cec26b280
```

**USDT (TRC20)**

```text
TMu2MLDVnjogZjL6K3w5qiBnNePTXNhpNg
```

Thank you for the support.

If you like this project, please star the repository.
