import { defineElement, ref } from "zipaper"
import template from "./index.html"
import style from "./index.scss"

import Canvas from "vislite/lib/Canvas/index.es.js"
import getKeyCode from './keyCode'

var painter
export default defineElement({
    template,
    style: {
        content: style
    },
    data() {
        return {

            // 提示内容
            tips: ref("温馨提示：点击「开始游戏」启动运行！"),

            // 记录是否游戏中
            isRuning: ref(false),

            // 食物
            foodBlock: [],

            // 记录小蛇
            blocks: [],

            // 下一步走法
            mulpD: "",

            // 记录最近一次吃到食物的时间（用于嘴巴扩张动画）
            headEatAt: 0

        }
    },
    created: function () {

        // 获取画笔
        painter = new Canvas(document.getElementById('mycanvas'));

        this.updateView();

        // 启动键盘监听
        var _this = this;
        getKeyCode(function (keyCode) {
            switch (keyCode) {
                case 'up': {
                    _this.mulpD = [0, -1];
                    break;
                }
                case 'down': {
                    _this.mulpD = [0, 1];
                    break;
                }
                case 'left': {
                    _this.mulpD = [-1, 0];
                    break;
                }
                case 'right': {
                    _this.mulpD = [1, 0];
                    break;
                }
            }
        });
    },
    methods: {

        // 刷新视图
        updateView: function () {
            var i;

            painter.clearRect(0, 0, 500, 500);

            // 轻量格子（更低对比度）
            painter.config({ strokeStyle: "rgba(255,255,255,0.04)", lineWidth: 1 });
            for (i = 0; i < 25; i++) {
                painter
                    .beginPath().moveTo(0, i * 20).lineTo(500, i * 20).stroke()
                    .beginPath().moveTo(i * 20, 0).lineTo(i * 20, 500).stroke();
            }

            var now = Date.now();

            // 绘制食物：脉冲圆 + 发光
            if (this.foodBlock && this.foodBlock.length === 2) {
                var fx = this.foodBlock[0] * 20 + 10;
                var fy = this.foodBlock[1] * 20 + 10;
                var pulse = 1 + Math.sin(now / 160) * 0.12;
                var fr = 8 * pulse;

                painter.config({ shadowBlur: 14, shadowColor: 'rgba(255,80,80,0.9)', fillStyle: 'rgba(255,80,80,1)' })
                    .beginPath().arc(fx, fy, fr, 0, Math.PI * 2).fill();

                // 内核高光
                painter.config({ shadowBlur: 0, fillStyle: 'rgba(255,220,220,0.95)' })
                    .beginPath().arc(fx, fy, fr * 0.45, 0, Math.PI * 2).fill();
            }

            // 绘制小蛇：用圆形段，头部更突出并带“眼睛”
            for (i = 0; i < this.blocks.length; i++) {
                var b = this.blocks[i];
                var cx = b[0] * 20 + 10;
                var cy = b[1] * 20 + 10;
                var isHead = (i === 0);

                var t = i / Math.max(1, this.blocks.length - 1);
                var hue = 140 - Math.floor(60 * t); // 从绿色到黄绿色
                var light = isHead ? 42 : 62 - Math.floor(20 * t);
                var color = 'hsl(' + hue + ',85%,' + light + '%)';

                if (isHead) {
                    var dir = (this.mulpD && this.mulpD.length === 2) ? this.mulpD : [0, -1];
                    var dx = dir[0], dy = dir[1];

                    // 外层轮廓（基础头部）
                    painter.config({ shadowBlur: 12, shadowColor: 'rgba(0,0,0,0.5)', fillStyle: color })
                        .beginPath().arc(cx, cy, 12, 0, Math.PI * 2).fill();

                    // 下颚（浅色，形成明显下巴与中间缺口）
                    var jawColor = 'hsl(100,40%,62%)';
                    painter.config({ shadowBlur: 0, fillStyle: jawColor })
                        .beginPath().arc(cx, cy + 6, 9, 0, Math.PI, true).fill();

                    // 中央竖缝
                    painter.config({ strokeStyle: 'rgba(0,0,0,0.28)', lineWidth: 1 })
                        .beginPath().moveTo(cx, cy - 10).lineTo(cx, cy + 8).stroke();

                    // 根据时间计算眨眼与张嘴动画
                    var blinkCycle = 2200;
                    var blinkDuration = 160;
                    var phase = now % blinkCycle;
                    var isBlink = phase < blinkDuration;

                    // 高光位置：优先朝向食物偏移，否则使用方向性高光
                    var hx = cx - dx * 2 - dy * 2;
                    var hy = cy - dy * 2 + dx * 2;
                    if (this.foodBlock && this.foodBlock.length === 2) {
                        var fcx = this.foodBlock[0] * 20 + 10;
                        var fcy = this.foodBlock[1] * 20 + 10;
                        var vx = fcx - cx, vy = fcy - cy;
                        var vlen = Math.sqrt(vx * vx + vy * vy) || 1;
                        hx = cx + (vx / vlen) * 4;
                        hy = cy + (vy / vlen) * 4;
                    }

                    painter.config({ shadowBlur: 0, fillStyle: 'rgba(255,255,255,0.12)' })
                        .beginPath().arc(hx, hy, 6, 0, Math.PI * 2).fill();

                    // 头部前方小高光
                    painter.config({ fillStyle: 'rgba(255,255,255,0.18)' })
                        .beginPath().arc(cx + dx * 4, cy + dy * 4, 2.4, 0, Math.PI * 2).fill();

                    // 眼睛位置（沿前进方向并左右分开），绘制黄环大眼风格
                    var eyeAlong = 3;
                    var eyePerp = 3;
                    var ex1 = cx + dx * eyeAlong - dy * eyePerp;
                    var ey1 = cy + dy * eyeAlong + dx * eyePerp;
                    var ex2 = cx + dx * eyeAlong + dy * eyePerp;
                    var ey2 = cy + dy * eyeAlong - dx * eyePerp;

                    // 眨眼：闭眼时画细线，睁眼时画圆
                    if (isBlink) {
                        painter.config({ strokeStyle: '#071014', lineWidth: 2 })
                            .beginPath().moveTo(ex1 - 3, ey1).lineTo(ex1 + 3, ey1).stroke()
                            .beginPath().moveTo(ex2 - 3, ey2).lineTo(ex2 + 3, ey2).stroke();
                    } else {
                        // 眼白外环
                        painter.config({ fillStyle: '#f6e05e' })
                            .beginPath().arc(ex1, ey1, 6.2, 0, Math.PI * 2).fill()
                            .beginPath().arc(ex2, ey2, 6.2, 0, Math.PI * 2).fill();

                        // 眼圈内层（更深的黄色）
                        painter.config({ fillStyle: '#dfbf3a' })
                            .beginPath().arc(ex1, ey1, 4.6, 0, Math.PI * 2).fill()
                            .beginPath().arc(ex2, ey2, 4.6, 0, Math.PI * 2).fill();

                        // 瞳孔
                        painter.config({ fillStyle: '#070707' })
                            .beginPath().arc(ex1, ey1, 2.4, 0, Math.PI * 2).fill()
                            .beginPath().arc(ex2, ey2, 2.4, 0, Math.PI * 2).fill();

                        // 眼睛高光
                        painter.config({ fillStyle: 'rgba(255,255,255,0.9)' })
                            .beginPath().arc(ex1 - 1.2, ey1 - 1.6, 0.9, 0, Math.PI * 2).fill()
                            .beginPath().arc(ex2 - 1.2, ey2 - 1.6, 0.9, 0, Math.PI * 2).fill();
                    }

                    // 张合嘴：周期性张合，幅度受速度影响（移动越快张得越大）
                    var mouthOsc = Math.abs(Math.sin(now / 180));
                    var speedFactor = (Math.abs(dx) + Math.abs(dy)) || 1;
                    var mouthOpen = 2 + mouthOsc * 4 * speedFactor;

                    // 吃到食物瞬间扩张（基于 headEatAt 时间戳）
                    if (this.headEatAt) {
                        var eatElapsed = now - this.headEatAt;
                        var eatDur = 420; // 动画持续时间 ms
                        if (eatElapsed < eatDur) {
                            var p = 1 - eatElapsed / eatDur; // 1 -> 0
                            var extra = (p * p) * 8; // 缓和衰减
                            mouthOpen += extra;
                        } else {
                            // 结束动画
                            this.headEatAt = 0;
                        }
                    }

                    // 画嘴为向前的三角形
                    var px = -dy, py = dx; // 垂直向量
                    var tipX = cx + dx * (7 + mouthOpen);
                    var tipY = cy + dy * (7 + mouthOpen);
                    var base1X = cx + px * 3 - dx * 2;
                    var base1Y = cy + py * 3 - dy * 2;
                    var base2X = cx - px * 3 - dx * 2;
                    var base2Y = cy - py * 3 - dy * 2;

                    painter.config({ fillStyle: 'rgba(10,10,10,0.9)' })
                        .beginPath().moveTo(tipX, tipY).lineTo(base1X, base1Y).lineTo(base2X, base2Y).closePath().fill();

                    // 鼻孔（两个小黑点）
                    var nostrilY = cy + 3;
                    painter.config({ fillStyle: '#050505' })
                        .beginPath().arc(cx - 3, nostrilY, 1.6, 0, Math.PI * 2).fill()
                        .beginPath().arc(cx + 3, nostrilY, 1.6, 0, Math.PI * 2).fill();

                    // 舌头：当嘴张开明显时绘制分叉舌
                    if (mouthOpen > 4) {
                        var tongueBaseX = cx + dx * (6 + mouthOpen / 2);
                        var tongueBaseY = cy + dy * (6 + mouthOpen / 2);
                        var tongueLen = 10 + mouthOpen * 1.5;
                        var tx = tongueBaseX + dx * tongueLen;
                        var ty = tongueBaseY + dy * tongueLen;

                        // 主舌身
                        painter.config({ strokeStyle: '#b92b2b', lineWidth: 2.6 })
                            .beginPath().moveTo(tongueBaseX, tongueBaseY).lineTo(tx, ty).stroke();

                        // 分叉
                        var perpX = -dy, perpY = dx;
                        painter.config({ strokeStyle: '#b92b2b', lineWidth: 2.2 })
                            .beginPath().moveTo(tx, ty).lineTo(tx + perpX * 4, ty + perpY * 4).stroke()
                            .beginPath().moveTo(tx, ty).lineTo(tx - perpX * 4, ty - perpY * 4).stroke();
                    }
                } else {
                    painter.config({ shadowBlur: 0, fillStyle: color })
                        .beginPath().arc(cx, cy, 8, 0, Math.PI * 2).fill();
                }
            }

            // 清理阴影设置
            painter.config({ shadowBlur: 0, shadowColor: 'transparent' });
        },

        // 开始游戏
        beginGame: function () {

            // 初始化参数
            this.isRuning = true;
            this.mulpD = [0, -1];
            this.foodBlock = [20, 20];
            this.blocks = [
                [10, 10],
                [10, 11],
                [10, 12],
                [10, 13],
                [11, 13],
                [12, 13],
                [13, 13],
                [14, 13]
            ];

            this.updateView();

            // 轮询修改数据
            var _this = this;
            var interval = setInterval(function () {

                var newBlock = [
                    _this.blocks[0][0] + _this.mulpD[0],
                    _this.blocks[0][1] + _this.mulpD[1]
                ];

                // 判断是否合法
                if (!_this.isValidBlock(newBlock)) {

                    _this.isRuning = false;
                    clearInterval(interval);
                    _this.tips = "[分数：" + (_this.blocks.length - 8) + "]小蛇出界或者撞到自己了。";

                    return;
                }

                _this.blocks.unshift(newBlock);

                // 判断是否吃到食物了
                if (
                    newBlock[0] == _this.foodBlock[0] &&
                    newBlock[1] == _this.foodBlock[1]
                ) {
                    // 记录吃到的时刻以触发头部扩张动画
                    _this.headEatAt = Date.now();
                    _this.foodBlock = _this.newFood();
                } else {
                    _this.blocks.pop();
                }

                _this.updateView();
            }, 200);

        },

        // 判断是否合法
        isValidBlock: function (block) {

            // 如果越界了
            if (block[0] < 0 || block[0] >= 25 || block[1] < 0 || block[1] >= 25) return false;

            for (var i = 0; i < this.blocks.length; i++) {

                // 如果撞到自己了
                if (this.blocks[i][0] == block[0] && this.blocks[i][1] == block[1]) return false;
            }

            return true;
        },

        // 产生新的事物
        newFood: function () {
            var newFood, tryNum = 1;
            do {

                if (tryNum >= 10000) {
                    this.isRuning = false;
                    this.tips = '意外终止，系统内部错误。';
                }

                newFood = [
                    +(Math.random() * 24).toFixed(0),
                    +(Math.random() * 24).toFixed(0)
                ];
                tryNum += 1;
            } while (!this.isValidBlock(newFood));

            return newFood;
        }
    }
})