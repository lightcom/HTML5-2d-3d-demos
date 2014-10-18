// ---- Инициализация параметров ----- //

// html элементы
var canvas = document.getElementById("canvas"); // получаем элемент canvas
var _ctx = canvas.getContext("2d"); // получаем 2d контекст canvas'а для возможности прорисовки

// Параметры физики и анимации
// для моделировании используется три параметра:
//   1 - гравитация, т.е. сила притяжение объектов вниз
//   2 - гашение, используемое уменьшения ускорения движения объектов
//   3 - сила оттакливания, используемое для изменения ускорения движения объектов при столкновении объектов
var _gravity = 0.1; // коэффициент влияния гравитации
var _dampening = 0.99; // коэффициент гашения
var _repulsion = -0.7; // коэффициент силы отталкивания
var _animate = true; // анимация вкл/откл
var _tale = 0.5; // след от шаров - значение между 0 (нет следа) и 1 (полный след)
var fixedToMouse = true;

// Параметры шаров
var _radius = 20; // радиус шаров
var _countCircles = 10; // количество шаров
var _circles = []; // массив шаров
var _circle; // текущий (выбранный) шар
var _circleCtrlMouse; // шар, удерживаемый мышью

// Мышь
var _mouse = {
    x: 0,y: 0,  // координаты
    down: false // лев. кнопка зажата (да/нет)
};

// ---- Инициализация функций ----- //
// функция циклов анимации
function execFrame(){
    if(_animate) requestAnimFrame(execFrame); // если анимация включена, то выполняем функцию с задержкой
    iterModelSim(); // функция моделирования

    _ctx.fillStyle = 'rgba(255,255,255,'+(1-_tale)+')'; // цвет заливки canvas
    _ctx.fillRect(0,0,canvas.width,canvas.height); // заливаем canvas

    draw();
}

// инициализация окружностей
function initCircles(){
    _circles = []; // массив окружностей
    for(i = 0; i < _countCircles; i++){ // добавляем окружностю распложенные в случайном порядке
        _circles.push(
            {
                x:Math.random() * canvas.width,
                y:Math.random() * canvas.height,
                velocity: {x:0, y:0}
            }
        );
    }
}

// функция прорисовки
function draw(){  
  // рисуем границу
  _ctx.lineWidth = "3";
  _ctx.strokeRect(0,0,canvas.width,canvas.height);
  // рисуем окружности
  for(i = 0; i < _circles.length; i++){
        _circle = _circles[i]; // выбираем окружность
        _ctx.beginPath(); // очищаем путь
        _ctx.arc(_circle.x, _circle.y, _radius, 0, 2 * Math.PI); // рисуем окружность
        if(_circle === _circleCtrlMouse){ // если выбранная окружность удерживается мышью
            _ctx.fillStyle = "rgba(215, 44, 44, 0.5)"; // устанавливаем цвет
            _ctx.lineWidth = "5"; // особая граница
            _ctx.stroke(); // рисуем границу
        }
        else{ // если выбранная окружность не удерживается мышью
            var r = i*5;
            var g = i*15;
            var b = i*10;
            _ctx.fillStyle = 'rgb('+r+', '+g+', '+b+')'; // устанавливаем цвет
        }
        _ctx.fill(); // заливаем окружность цветом
  }
}

// функция симулации физики
function iterModelSim(){
  // цикл по всем окружностям
  for(var i = 0; i < _circles.length; i++){
    _circle = _circles[i];
    
    //функция удерживания окружности мышью
    pullToMouse();
    
    // изменяем координату y на значение гравитации
    _circle.velocity.y += _gravity;
    
    // изменяем скорость перемещения по координатам на значение коэфициента гаршения движения
    _circle.velocity.x *= _dampening;
    _circle.velocity.y *= _dampening;
    
    // изменяем координаты следуя скорости движения
    _circle.x += _circle.velocity.x;
    _circle.y += _circle.velocity.y;
    
    // если окружность достигает пола
    if(_circle.y > canvas.height - _radius){
      _circle.y = canvas.height - _radius; // окружность не уходит за границу пола
      _circle.velocity.y = - Math.abs(_circle.velocity.y); // скорость по y меняется на отрицательную
    }  // если окружность достигает потолка
    if(_circle.y < _radius){
      _circle.y = _radius; // окружность не уходит за границу потолока
      _circle.velocity.y = Math.abs(_circle.velocity.y); // скорость по y меняется на положительную
    } // если окружность достигает правой стены
    if(_circle.x > canvas.width - _radius){
      _circle.x = canvas.width - _radius; // окружность не уходит за границу стены
      _circle.velocity.x = -Math.abs(_circle.velocity.x); // скорость по х меняется на отрицательную
    } // если окружность достигает левой стены
    if(_circle.x < _radius){
      _circle.x = _radius;// окружность не уходит за границу стены
      _circle.velocity.x = Math.abs(_circle.velocity.x); // скорость по х меняется на положительную
    }
    
    // отскакивание окружностей друг от друга
    // цикл по всем окружностям, кроме текущего
    for(var j = i + 1; j < _circles.length; j++){
      var circle2 = _circles[j];
      var dx = circle2.x - _circle.x; //измеряем расстояние по х
      var dy = circle2.y - _circle.y; //измеряем расстояние по y
      var d = Math.sqrt(dx*dx + dy*dy); // получаем расстоение между центрами двух окружностей
      
      if(d < 2*_radius){ // если это расстояние меньше суммы их радиусов (т.е. они соприкоснулись)
        if(d === 0){ // если дистанция равна нулю, то изменяем значение на 0,1, для исключения ошибки деления на 0
          d = 0.1;
        }
        
        var forceX = (dx/d) * _repulsion;  //измеряем скорость по х и изменяем на коэффициент отскакивания
        var forceY = (dy/d) * _repulsion;  //измеряем скорость по y и изменяем на коэффициент отскакивания
        
        _circle.velocity.x += forceX; //изменяем скорость по y выбранной окружности
        _circle.velocity.y += forceY; //изменяем скорость по х выбранной окружности
        
        circle2.velocity.x -= forceX; //изменяем скорость по y второй окружности
        circle2.velocity.y -= forceY; //изменяем скорость по х второй окружности
      }
    }
  }
}

// функция перемещения окружности выбранной мышью
function pullToMouse(){
    if(_circle === _circleCtrlMouse){ // если текущая окружность явлется выбранной
        if(fixedToMouse){ // если мышь зажала окружность
            var ballMouseY = _mouse.y - _circle.y; // получаем расстояние между мышью и окружностью
            var ballMouseX = _mouse.x - _circle.x; // получаем расстояние между мышью и окружностью
            _circle.velocity.y += ballMouseY * 0.1; // изменяем скорость окружности
            _circle.velocity.x += ballMouseX * 0.1; // изменяем скорость окружности
            _circle.x = _mouse.x; // изменяем положение окружности на положение мыши
            _circle.y = _mouse.y; // изменяем положение окружности на положение мыши
        }
    }
}

// добавляем событие движения мышью
canvas.addEventListener("mousemove", function(e){
  _mouse.x = e.x - canvas.offsetLeft; // получаем координату мыши
  _mouse.y = e.y - canvas.offsetTop; // получаем координату мыши
});
// добавляем событие клика мышью
canvas.addEventListener("mousedown", function(e){
  _mouse.down = true; // ставим статус мыши
  
  for(i = 0; i < _circles.length; i++){ // цикл по всем окружностям
    var circle = _circles[i];
    var dx = _mouse.x - circle.x; // получаем расстояние между мышью и окружностью по х
    var dy = _mouse.y - circle.y; // получаем расстояние между мышью и окружностью по y
    var d = Math.sqrt(dx*dx + dy*dy); // получаем расстояние между мышью и окружностью
    
    if(d < _radius){ // если расстояние меньше радиуса
      _circleCtrlMouse = circle; // то устанавливаем зажатой окружнастью текущую
      break; // останавливаем цикл
    }
  }
});
// добавляем событие отпускания кнопки мышьи
canvas.addEventListener("mouseup", function(e){
  _mouse.down = false; // ставим статус мыши
  _circleCtrlMouse = null; // осовождаем зажатую окружность
});
// добавляем событие ухода мыши из области canvas
canvas.addEventListener("mouseout", function(e){
  _mouse.down = false; // ставим статус мыши
  _circleCtrlMouse = null; // осовождаем зажатую окружность
});
// добавляем событие стоп/запуска
document.getElementById("stop-go").onclick = function () { 
    _animate = !_animate; // отключаем/включаем анимацю
    if(_animate) execFrame(); //запускаем анимацию
    document.getElementById("stop-go").value = _animate ? "СТОП" : "НАЧАТЬ!"; // меняем название кнопки
} 
// добавляем событие перезапуска
document.getElementById("reset").onclick = function () { 
    initCircles(); // инициализация окружностей
    execFrame(); // запускаем анимацию
}

//  ---- Выполнение ----- //

initCircles(); // инициализация окружностей
execFrame(); // запускаем анимацию