# Plumber engine API

## Конструктор: `new Plumber(options)`
Где `options` - объект-список опций. Возможные опции:
* `mode:` [String][*optional*] - режим компоненты.
  Может быть `"constructor"` (по умолчанию) или `"viewer"`

* `eroot:` [HTMLElement][*optional*] - элемент, в который поместить
  компоненту. Если не указан - компонента не будет автоматически
  помещена в дерево DOM.

* `dirSamples:` [String][*optional*] - путь к директории с файлами моделей.
  Добавляется к `src` в методах `addElement`, `replaceElement` итд.
  По умолчанию пустая строка.

* `initFromHash:` [Boolean][*optional*] - загрузить модель из хеш-фрагмента.
  По умолчанию false.

#### Пример:
```javascript
var plumber = new Plumber

var plumber = new Plumber({
  eroot: document.body,
  mode: 'viewer',
  dirSamples: 'samples/',
  initFromHash: true
})
```




## Свойства:
* `.element` [HTMLElement] - Корневой элемент компоненты.
  Если в конструкторе не была указана опция `eroot`,
  то этот элемент нужно поместить в документ.
  Пример: `document.body.appendChild(plumber.element)`

* `.events` [EventEmitter](#eventemitter) - Объект, отвечающий за события.



## Методы:
### `addElement(id, src, [link])`
Загрузить и отобразить модель.
  В режиме `"constructor"` окно разделится на две части для выбора соединений.
  В режиме `"viewer"` модель просто отобразится в окне.
* аргумент `id` [String][**deprecated**] - уникальный идентификатор модели. Будет
  удален за ненадобностью.
* аргумент `src` [String] - URL-адрес для загрузки.
* аргумент `link` [String][*optional*] - URL-ссылка на описание изделия.
  если указана - при выборе модели будет отображаться кнопка “info”
#### Связанное событие: [`"onAddElement"`](#onaddelement)
#### Пример:
```javascript
plumber.addElement('EFG6K', 'assets/samples/EFG6K.json', 'http://parts.info/desc/EFG6K')
plumber.addElement('test01', 'assets/samples/test.json')
```


### `replaceElement(src, param)`
Заменить узел другой моделью.
* аргумент `src` [String] - уникальный идентификатор модели.
* аргумент `param` [Number] - заменяемый узел. Возможны значения:
  * `-1` - замена всех разрешенных узлов моделью;
  * `0` - выделить графически разрешенные для замены узлы;
  * `id` - идентификатор узла, подлежащего замене. Может быть получен при событии `"onNodeSelect"`, `"onAddElement"`
#### Связанное событие: [`"onReplaceElement"`](#onreplaceelement)


### `connectElement(src, indexA, id, indexB, [animate])`
Встроить модель в конкретную точку дерева.
* аргумент `src` [String] - идентификатор модели.
* аргумент `indexA` [Number] - индекс крепления добавляемой модели.
* аргумент `id` [Number] - существующий узел, к которому произвести крепление.
* аргумент `indexB` [Number] - индекс крепления существующего узла.
* аргумент `animate` [Boolean][*optional*] - анимировать соединение.
#### Связанное событие: [`"onConnectElement"`](#onconnectelement)
#### Пример:
```javascript
plumber.connectElement('EFG6K.json', 0, 11, 2)
```


### `clear()`
Очистить отображаемое дерево узлов


### `setMode(mode)`
Изменить режим компоненты на `"constructor"` или `"viewer"`, первый раз вызывается в конструкторе


### `getConnectionsArray()` > [Array[Object]]
Возвращает массив соединений


### `getElementById(id)` > [Object]
Получить элемент по идентификатору
* аргумент `id` [Number] - id узла


### `getElementIdList()` > [Array[Number]]
  Возващает массив id всех узлов в дереве


## События:
### `"onAddElement"`
Вызывается при добавлении модели.
#### Поля объекта события:
* `status:` [String] - результат добавления модели, может быть
  * `"connected"` - модель добавлена в дерево
  * `"canceled"` - добавление модели отменено
  * `"rejected"` - модель не имеет подходящих креплений
  * `"error"` - ошибка при добавлении модели
* `nodes:` [Array[Number]][*optional*] - массив id добавленных узлов,
  существует только в статусе `"connected"`
#### Пример:
```javascript
plumber.events.on('onAddElement', function(e) {
  if(e.status === 'connected') {
    console.log('added', e.nodes.length, 'nodes:', nodes)
  } else {
    console.log("can't add element, event status:", e.status)
  }
})
```

### `"onRemoveElement"`
Вызывается при удалении модели и очистке компоненты.
#### Поля объекта события:
* `root:` [Object] - корень удаляемых узлов
* `nodes:` [Array[Number]] - массив id удаляемых узлов
#### Пример:
```javascript
plumber.events.on('onRemoveElement', function(e) {
  console.log('removed', e.nodes.length, 'nodes')
})
```

### `"onReplaceElement"`
Вызывается при замене узла методом `replaceElement`.
#### Поля объекта события:
* `status:` [String] - результат замены модели, может быть
  * `"replaced"` - замена произошла успешно
  * `"rejected"` - замена невозможна
* `nodes:` [Array[Number]][*optional*] - массив id замененных узлов,
  существует только в статусе `"replaced"`
* `reason:` [String|Mixed][*optional*] - причина отказа.
  существует только в статусе `"rejected"`


### `"onConnectElement"`
Вызывается при встаивании узла методом `connectElement`
#### Поля объекта события:
* `status:` [String] - результат встраивания модели, может быть
  * `"connected"` - встраивание произошло успешно
  * `"rejected"` - встраивание невозможно
* `nodes:` [Array[Number]][*optional*] - массив id встроенных узлов,
  существует только в статусе `"connected"`
* `reason:` [String|Mixed][*optional*] - причина отказа.
  существует только в статусе `"rejected"`


### `"onNodeSelect"`
Вызывается при выделении узла.
#### Аргументы события:
0. `node` [Number] - id текущего выбранного узла, может быть `undefined`
1. `prev` [Number] - id предыдущего выбранного узла, может быть `undefined`
#### Пример:
```javascript
plumber.events.on('onNodeSelect', function(node, prev) {
  console.log('now selected:', node, 'and previous was:', prev)
})
```





# EventEmitter
var events = new EventEmitter

## Методы:
### `on(type, func, [scope])`
Подписаться на событие.
* аргумент `type` [String] - идентификатор события.
* аргумент `func` [Function] - функция-обработчик.
* аргумент `scope` [Object][*optional*] - контекст, в котором будет вызвана функция.
#### Пример:
```javascript
plumber.events.on('onAddElement', function(e) {
  console.log('add result:', e.status)
})

// подписать метод addElementResult, и сохранить контекст this
plumber.events.on('onAddElement', this.addElementResult, this)
```

### `once(type, func, [scope])`
Аналогично `on()`, только обработчик выполняется один раз.

### `off([type], [func], [scope])`
Отписаться от события. Все совпадающие по трем аргументам обработчики будут удалены.
Если аргумент == null, то он совпадает с любым значением.
* аргумент `type` [String][*optional*]
* аргумент `func` [Function][*optional*]
* аргумент `scope` [Object][*optional*]
#### Пример:
```javascript
// убрать конкретную подписку
plumber.events.off('onAddElement', this.addElementResult, this)

// убрать все подписки на onRemoveElement
plumber.events.off('onRemoveElement')

// убрать все подписки с контекстом this
plumber.events.off(null, null, this)

// убрать вообще все подписки
plumber.events.off()
```
