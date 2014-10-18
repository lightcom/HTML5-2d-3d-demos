
// ===== Инициализация параметров ===== //
// html элементы
var _scr;
var _canvas;
// Параметры анимации и графики
var nx, ny, nw, nh; // положение и размер экрана
var cx = 50, cy = 50, cz = 0; // коэфф. вращения по осям
var cxb = 0, cyb = 0; // // доп. коэфф. сохранения вращения (запоминает посл. направление и скорость)
var cosY, sinY, cosX, sinX, cosZ, sinZ; // значения триг. функций
var minZ; //минимальная глубина точек
var angleY = 0, angleX = 0, angleZ = 0; // угол поворота по осям
var bkgColor = "rgba(256,256,256,0.2)"; //закраска фона - светлый

var autorotate = true; // автовращение
var running = true; // запуск
// мышь
var xm = 0, ym = 0; //координаты мыши
var startX = 0, startY = 0; // начальное положение мыши при клике
var drag; // состояние перетаскивания мыши
var moved; // состояние движение мыши больше ограничения
// поле зрения
var fl = 250; // фокусное расстояние
var zoom = 0; // увеличение
// Параметры шаров
var cubes; // кубы
var faces; // границ
var faceOver; // выделенная грань

// ===== Конструкторы объектов ===== //
// ----- Канвас -----
var Canvas = function(id) {
    this.container = document.getElementById(id);
    this.ctx = this.container.getContext("2d");
    this.resize = function(w, h) {
        this.container.width = w;
        this.container.height = h;
    }
};
// ----- Точка -----
var Point = function(parent, xyz, project) {
    this.project = project;
    this.xo = xyz[0];
    this.yo = xyz[1];
    this.zo = xyz[2];
    this.cube = parent;
    // функция проекции точки из 3d в 2d
    this.projection = function() {
        // ---- 3D вращение: аффинное преобразование координат ---- 
        var x = cosY * (sinZ * this.yo + cosZ * this.xo) - sinY * this.zo;
        var y = sinX * (cosY * this.zo + sinY * (sinZ * this.yo + cosZ * this.xo)) + cosX * (cosZ * this.yo - sinZ * this.xo);
        var z = cosX * (cosY * this.zo + sinY * (sinZ * this.yo + cosZ * this.xo)) - sinX * (cosZ * this.yo - sinZ * this.xo);
        this.x = x;
        this.y = y;
        this.z = z;
        if (this.project) {
            // ---- точка видима ---- 
            if (z < minZ)
                minZ = z;
            this.visible = (zoom + z > 0);
            // ---- проекция из 3D в 2D  ---- 
            this.X = (nw * 0.5) + x * (fl / (z + zoom));
            this.Y = (nh * 0.5) + y * (fl / (z + zoom));
        }
    };
};

// ----- Грань -----
var Face = function(cube, index, normalVector) {
    //  родительский куб 
    this.cube = cube;
    //  координаты 4х точек грани (квадрат) куба 
    this.p0 = cube.points[index[0]];
    this.p1 = cube.points[index[1]];
    this.p2 = cube.points[index[2]];
    this.p3 = cube.points[index[3]];
    // вектор нормали 
    this.normal = new Point(this, normalVector, false)
};
// определяем находится ли мышь на грани
Face.prototype.pointerInside = function() {
    var fAB = function(p1, p2, p3) {
        return (ym - p1.Y) * (p2.X - p1.X) - (xm - p1.X) * (p2.Y - p1.Y);
    };
    var fCA = function(p1, p2, p3) {
        return (ym - p3.Y) * (p1.X - p3.X) - (xm - p3.X) * (p1.Y - p3.Y);
    };
    var fBC = function(p1, p2, p3) {
        return (ym - p2.Y) * (p3.X - p2.X) - (xm - p2.X) * (p3.Y - p2.Y);
    };
    if (fAB(this.p0, this.p1, this.p3) * fBC(this.p0, this.p1, this.p3) > 0 && fBC(this.p0, this.p1, this.p3) * fCA(this.p0, this.p1, this.p3) > 0)
        return true;
    if (fAB(this.p1, this.p2, this.p3) * fBC(this.p1, this.p2, this.p3) > 0 && fBC(this.p1, this.p2, this.p3) * fCA(this.p1, this.p2, this.p3) > 0)
        return true;

    return false;
};
//  определяем видима ли грань  
Face.prototype.faceVisible = function() {
    //  точки видимы  
    if (this.p0.visible && this.p1.visible && this.p2.visible && this.p3.visible) {
        //  если не заднюя грань  
        if ((this.p1.Y - this.p0.Y) / (this.p1.X - this.p0.X) < (this.p2.Y - this.p0.Y) / (this.p2.X - this.p0.X) ^ this.p0.X < this.p1.X == this.p0.X > this.p2.X) {
            // то грань видима  
            this.visible = true;
            return true;
        }
    }
    //  грань не видима  
    this.visible = false;
    this.distance = -99999;
    return false;
};
//  определяем дистанцию до камеры  
Face.prototype.distanceToCamera = function() {
    var dx = (this.p0.x + this.p1.x + this.p2.x + this.p3.x) * 0.25;
    var dy = (this.p0.y + this.p1.y + this.p2.y + this.p3.y) * 0.25;
    var dz = (zoom + fl) + (this.p0.z + this.p1.z + this.p2.z + this.p3.z) * 0.25;
    this.distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
};
//  прорисовываем грань  
Face.prototype.draw = function() {
    _canvas.ctx.beginPath();
    _canvas.ctx.moveTo(this.p0.X, this.p0.Y);
    _canvas.ctx.lineTo(this.p1.X, this.p1.Y);
    _canvas.ctx.lineTo(this.p2.X, this.p2.Y);
    _canvas.ctx.lineTo(this.p3.X, this.p3.Y);
    _canvas.ctx.closePath();
    //  свет
    if (this == faceOver) { // если гран выделена
        var r = 256;
        var g = 0;
        var b = 200;
    } else {
        //  плоское затенение  
        this.normal.projection();
        var light = (this.normal.z * 0.8) * 256;
        var r = b = light;
        var g = light + 40;
    }
    //  заливка  
    _canvas.ctx.fillStyle = "rgba(" +
            Math.round(r) + "," +
            Math.round(g) + "," +
            Math.round(b) + ",1)";
    _canvas.ctx.fill();
};
// ----- Куб -----
var Cube = function(x, y, z, w) {
    // создаем точки
    this.w = w;
    this.points = [];
    var p = [
        [x - w, y - w, z - w],
        [x + w, y - w, z - w],
        [x + w, y + w, z - w],
        [x - w, y + w, z - w],
        [x - w, y - w, z + w],
        [x + w, y - w, z + w],
        [x + w, y + w, z + w],
        [x - w, y + w, z + w]
    ];
    for (var i in p) {
        this.points.push(new Point(this, p[i], true));
    }
    // точки граней
    var f = [
        [0, 1, 2, 3],
        [0, 4, 5, 1],
        [3, 2, 6, 7],
        [0, 3, 7, 4],
        [1, 5, 6, 2],
        [5, 4, 7, 6]
    ];
    // нормали граней
    var nv = [
        [0, 0, 1],
        [0, 1, 0],
        [0, -1, 0],
        [1, 0, 0],
        [-1, 0, 0],
        [0, 0, -1]
    ];
    // добавляем грани кубу
    for (var i in f) {
        faces.push(new Face(this, f[i], nv[i]));
    }
};

// ===== Инициализация функций ===== //
// изменение размера экрана
var resize = function() {
    nw = _scr.offsetWidth;
    nh = _scr.offsetHeight;
    var o = _scr;
    for (nx = 0, ny = 0; o != null; o = o.offsetParent) {
        nx += o.offsetLeft;
        ny += o.offsetTop;
    }
    _canvas.resize(nw, nh);
};
// сброс и создание первого куба
var reset = function() {
    cubes = [];
    faces = [];
    cubes.push(new Cube(0, 0, 0, 50));
    angleY = 0, angleX = 0, angleZ = 0;
    fl = 250;
    zoom = 0;
};
// определение грани под мышью
var detectFaceOver = function() {
    var j = 0, f;
    faceOver = false;
    while (f = faces[j++]) {
        if (f.visible) {
            if (f.pointerInside()) {
                faceOver = f;
            }
        }
        else
            break;
    }
};
// инициализация и запуск
var init = function() {
    _scr = document.getElementById("screen");
    _canvas = new Canvas("canvas");
    // добавление события нажатия кнопки
    _scr.onmousedown = function(e) {
        if (!running)
            return true;
        if (e.target !== _canvas.container)
            return;
        e.preventDefault();
        if (_scr.setCapture)
            _scr.setCapture();
        moved = false;
        drag = true;
        startX = e.clientX - nx;
        startY = e.clientY - ny;
    };
    // добавление события движениямыши
    _scr.onmousemove = function(e) {
        if (!running)
            return true;
        e.preventDefault();
        xm = e.clientX - nx;
        ym = e.clientY - ny;
        detectFaceOver();
        if (drag) {
            cx = cxb + (xm - startX);
            cy = cyb - (ym - startY);
        }
        if (Math.abs(xm - startX) > 10 || Math.abs(ym - startY) > 10) { //если движение больше 10 px
            moved = true;
        }
    };
    // добавление события отпускания кнопки
    _scr.onmouseup = function(e) {
        if (!running)
            return true;
        e.preventDefault();
        drag = false;
        cxb = cx;
        cyb = cy;
        if (!moved) {
            xm = startX;
            ym = startY;
        }
    };
    // добавление события колесика мыши
    _scr.onmousewheel = function() {
        if (!running)
            return true;
        fl += event.wheelDelta / 10;
        return false;
    }
    // изменение размера экрана
    resize();
    // добавление события изменения размера экрана
    window.addEventListener('resize', resize, false);
    document.getElementById("autor").onchange = function() {
        autorotate = this.checked;
    }
    document.getElementById("stopgo").onclick = function() {
        running = !running;
        document.getElementById("stopgo").value = running ? "СТОП" : "НАЧАТЬ!";
        if (running)
            run();
    }
    document.getElementById("reset").onclick = function() {
        reset();
    }
    // запуск
    reset();
    run();
}
// запуск
var run = function() {
    // фон экрана
    _canvas.ctx.fillStyle = bkgColor;
    _canvas.ctx.fillRect(0, 0, nw, nh);
    // смягчение вращения
    angleX += ((cy - angleX) * 0.05);
    angleY += ((cx - angleY) * 0.05);
    angleZ += ((cz - angleZ) * 0.05);
    if (autorotate)
        cz += 1;
    // предрасчет знач по тригонометрическим функциям
    cosY = Math.cos(angleY * 0.01);
    sinY = Math.sin(angleY * 0.01);
    cosX = Math.cos(angleX * 0.01);
    sinX = Math.sin(angleX * 0.01);
    cosZ = Math.cos(angleZ * 0.01);
    sinZ = Math.sin(angleZ * 0.01);
    // проекция точек
    minZ = 0;
    var i = 0, c;
    while (c = cubes[i++]) {
        var j = 0, p;
        while (p = c.points[j++]) {
            p.projection();
        }
    }
    // адаптирование увеличения
    var d = -minZ + 100 - zoom;
    zoom += (d * ((d > 0) ? 0.05 : 0.01));
    // освещение граней
    var j = 0, f;
    while (f = faces[j++]) {
        if (f.faceVisible()) {
            f.distanceToCamera();
        }
    }
    // сортировка граней по глубине
    faces.sort(function(p0, p1) {
        return p1.distance - p0.distance;
    });
    // окрашивание граней
    j = 0;
    while (f = faces[j++]) {
        if (f.visible) {
            f.draw();
        } else
            break;
    }
    // цикл анимации каждые 16 миллисекунд
    if (running)
        setTimeout(run, 16);
}

//  ---- Выполнение ----- //
init();
