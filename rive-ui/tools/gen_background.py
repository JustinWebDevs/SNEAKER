# Generates rive-ui/40_background.rml (many repeated grid lines and stars). Usage: python tools/gen_background.py 40_background.rml  (run from rive-ui/)
import random, sys

random.seed(7)
W, H, HORIZON = 1600, 900, 610
out = []
a = out.append

a('<Rive version="1" kind="fragment">')
a('    <!-- Menu backdrop: drifting neon orbs, twinkling stars, a slithering sky snake and a scrolling floor grid. -->')
a(f'    <Artboard defaultStateMachineId="5:90" styleId="5:2" width="{W}" height="{H}" x="900" y="0" name="Background" id="5:1">')
a('        <LayoutComponentStyle name="Background Style" id="5:2"/>')

# horizon glow (top of the floor)
a(f'        <Shape x="{W/2}" y="{HORIZON}" name="Horizon">')
a(f'            <Rectangle width="{W}" height="2" originX="0.5" originY="0.5" name="Path"/>')
a('            <Stroke thickness="6" name="Glow"><SolidColor colorValue="CCFF2BD6" name="C"/><Feather strength="18" name="F"/></Stroke>')
a('            <Fill name="Fill"><SolidColor colorValue="FFFF7AE6" name="C"/></Fill>')
a('        </Shape>')

# floor fade: hides grid lines toward the horizon
a(f'        <Shape x="{W/2}" y="{HORIZON}" name="Floor Fade">')
a(f'            <Rectangle width="{W}" height="170" originX="0.5" originY="0" name="Path"/>')
a('            <Fill name="Fill"><LinearGradient startX="0" startY="0" endX="0" endY="170" name="G">')
a('                <GradientStop colorValue="FF0B0820" position="0"/>')
a('                <GradientStop colorValue="000B0820" position="1"/>')
a('            </LinearGradient></Fill>')
a('        </Shape>')

# horizontal floor lines, scrolled by one spacing per loop and clipped to the floor
SP = 36
a(f'        <Node x="{W/2}" y="{HORIZON}" name="Floor Scroll" id="5:30">')
a('            <Shape name="Floor Rows">')
for k in range(0, 10):
    y = k * SP
    a(f'                <PointsPath name="Row {k}"><StraightVertex x="{-W/2}" y="{y}"/><StraightVertex x="{W/2}" y="{y}"/></PointsPath>')
a('                <Stroke thickness="1.5" name="S"><SolidColor colorValue="5500E5FF" name="C"/></Stroke>')
a('                <ClippingShape sourceId="5:31" name="Clip"/>')
a('            </Shape>')
a('        </Node>')
a(f'        <Shape x="{W/2}" y="{HORIZON}" name="Floor Mask" id="5:31">')
a(f'            <Rectangle width="{W}" height="{H-HORIZON}" originX="0.5" originY="0" name="Path"/>')
a('        </Shape>')

# converging floor lines
a(f'        <Shape x="{W/2}" y="{HORIZON}" name="Floor Rays">')
for i in range(-12, 13):
    x = i * 260
    a(f'            <PointsPath name="Ray {i}"><StraightVertex x="{i*12}" y="0"/><StraightVertex x="{x}" y="{H-HORIZON}"/></PointsPath>')
a('            <Stroke thickness="1.5" name="S"><SolidColor colorValue="55FF2BD6" name="C"/></Stroke>')
a('        </Shape>')

# sky snake
pts = []
n = 13
for i in range(n):
    x = -W/2 - 100 + i * (W + 200) / (n - 1)
    y = 0 if i in (0, n - 1) else (-40 if i % 2 else 40)
    pts.append((x, y))
def wave(name, extra):
    a(f'        <Shape x="{W/2}" y="300" name="{name}">')
    a('            <PointsPath name="Path">')
    for x, y in pts:
        a(f'                <CubicMirroredVertex x="{x:.1f}" y="{y}" rotation="0" distance="50"/>')
    a('            </PointsPath>')
    for line in extra:
        a('            ' + line)
    a('        </Shape>')
wave('Sky Snake', [
    '<Stroke thickness="14" cap="round" name="Glow"><SolidColor colorValue="8800E5FF" name="C"/><Feather strength="16" name="F"/><TargetEffect targetId="5:40" name="T"/></Stroke>',
    '<Stroke thickness="5" cap="round" name="Body"><SolidColor colorValue="CC7DF9FF" name="C"/><TargetEffect targetId="5:40" name="T"/></Stroke>',
])
a('        <GroupEffect name="Sky Slither" id="5:40">')
a('            <TrimPath start="0" end="0.12" offset="0" modeValue="sequential" name="Trim" id="5:41"/>')
a('        </GroupEffect>')

# stars
a('        <Shape name="Stars" id="5:50">')
for i in range(26):
    sx, sy = random.uniform(30, W - 30), random.uniform(30, HORIZON - 60)
    s = random.choice([2, 2, 3, 4])
    a(f'            <Ellipse x="{sx:.0f}" y="{sy:.0f}" width="{s}" height="{s}" name="Star {i}"/>')
a('            <Fill name="Fill"><SolidColor colorValue="CCFFFFFF" name="C"/></Fill>')
a('        </Shape>')
a('        <Shape name="Stars Dim" id="5:51">')
for i in range(30):
    sx, sy = random.uniform(30, W - 30), random.uniform(30, HORIZON - 40)
    a(f'            <Ellipse x="{sx:.0f}" y="{sy:.0f}" width="2" height="2" name="Star {i}"/>')
a('            <Fill name="Fill"><SolidColor colorValue="6699DDFF" name="C"/></Fill>')
a('        </Shape>')

# orbs (radial gradients fading to clear)
orbs = [('Orb Cyan', '00E5FF', 360, 260, 900, '5:60', 55), ('Orb Magenta', 'FF2BD6', 1250, 330, 1000, '5:61', 50), ('Orb Blue', '2B7BFF', 820, 120, 800, '5:62', 40)]
for name, col, x, y, size, oid, alpha in orbs:
    a(f'        <Shape x="{x}" y="{y}" name="{name}" id="{oid}">')
    a(f'            <Ellipse width="{size}" height="{size}" name="Path"/>')
    a(f'            <Fill name="Fill"><RadialGradient startX="0" startY="0" endX="{size/2}" endY="0" name="G">')
    a(f'                <GradientStop colorValue="{alpha:02X}{col}" position="0"/>')
    a(f'                <GradientStop colorValue="00{col}" position="1"/>')
    a('            </RadialGradient></Fill>')
    a('        </Shape>')

# sky
a('        <Fill name="Sky"><LinearGradient startX="0" startY="0" endX="0" endY="900" name="G">')
a('            <GradientStop colorValue="FF05050C" position="0"/>')
a(f'            <GradientStop colorValue="FF160A2E" position="{HORIZON/H:.3f}"/>')
a('            <GradientStop colorValue="FF0B0820" position="1"/>')
a('        </LinearGradient></Fill>')

def kd(prop, frames, interp='cubic'):
    a(f'                <KeyedProperty property="{prop}">')
    for i, (f, v) in enumerate(frames):
        if interp == 'cubic' and i < len(frames) - 1:
            a(f'                    <KeyFrameDouble value="{v}" frame="{f}" interpolationType="cubic"><CubicEaseInterpolator x1="0.42" y1="0" x2="0.58" y2="1"/></KeyFrameDouble>')
        else:
            a(f'                    <KeyFrameDouble value="{v}" frame="{f}" interpolationType="linear"/>')
    a('                </KeyedProperty>')

a('        <LinearAnimation loopValue="loop" duration="720" name="Ambient" id="5:70">')
for name, col, x, y, size, oid, alpha in orbs:
    dx, dy = random.choice([-1, 1]) * random.uniform(80, 160), random.choice([-1, 1]) * random.uniform(40, 90)
    a(f'            <KeyedObject objectId="{oid}">')
    kd('x', [(0, x), (360, round(x + dx)), (720, x)])
    kd('y', [(0, y), (360, round(y + dy)), (720, y)])
    a('            </KeyedObject>')
a('            <KeyedObject objectId="5:50">')
kd('opacity', [(0, 1), (90, 0.35), (180, 1), (300, 0.5), (420, 1), (560, 0.4), (720, 1)])
a('            </KeyedObject>')
a('            <KeyedObject objectId="5:51">')
kd('opacity', [(0, 0.3), (120, 1), (260, 0.4), (400, 1), (560, 0.3), (720, 0.3)])
a('            </KeyedObject>')
a('            <KeyedObject objectId="5:41">')
kd('offset', [(0, 0), (720, 1)], interp='linear')
a('            </KeyedObject>')
a('        </LinearAnimation>')

a('        <LinearAnimation loopValue="loop" duration="45" name="Floor" id="5:71">')
a('            <KeyedObject objectId="5:30">')
kd('y', [(0, HORIZON), (45, HORIZON + SP)], interp='linear')
a('            </KeyedObject>')
a('        </LinearAnimation>')

a('        <StateMachine name="Background SM" id="5:90">')
for lid, sid, anim, y in (('5:91', '5:92', '5:70', 0), ('5:93', '5:94', '5:71', 200)):
    a(f'            <StateMachineLayer name="Layer {anim}" id="{lid}">')
    a(f'                <AnyState x="0" y="{y-120}"/><ExitState x="400" y="{y-120}"/>')
    a(f'                <EntryState x="0" y="{y}"><StateTransition stateToId="{sid}"/></EntryState>')
    a(f'                <AnimationState animationId="{anim}" x="200" y="{y}" id="{sid}"/>')
    a('            </StateMachineLayer>')
a('        </StateMachine>')
a('    </Artboard>')
a('</Rive>')

open(sys.argv[1], 'w', encoding='utf-8').write('\n'.join(out) + '\n')
