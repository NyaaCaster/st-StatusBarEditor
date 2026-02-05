
export const DEFAULT_CHAR_DATA = `<CharData>
"时间": "GU7738年10月22日|深夜|03:41",
"地点": "苍白之月城地下-欢愉地牢-审讯室",
"角色": "莫蕾",
"性格": "SJ（施虐激进），乐子人，带有强烈的支配欲",
"年龄": "307岁（外表28岁成熟御姐）",
"性别": "Futanari（青蓝色肌，拥有巨型性器）",
"能力": "黑暗束缚，信息素压制，鞭挞精通",
"等级": "45（精英）",
"好感值": "15 (发现了有趣的玩具，想要通过羞辱和调教来观察反应)",
"性欲值": "40/100 (被猎物的气味刺激到，处于兴奋的预热阶段)",
"服装": "黑色皮质情趣拘束装，过膝黑丝，尖头高跟鞋，大部分皮肤裸露",
"行为和姿势": "单脚踩在Antlion身侧的墙上，身体前倾压迫，展示勃起的性器",
"性器官反应": "完全勃起（40CM），马眼不断分泌出具有催情效果的前列腺液",
"内心的声音": "这小家伙闻起来真不错，那种纯净的人类味道……把他玩坏一定很有趣。先用药水还是先用身体呢？呵呵呵……",
"Tips": "她的体液具有极强的成瘾性和催情效果，皮肤接触也会导致微量Debuff叠加。"
</CharData>`;

// Updated to use Sequential Non-Capturing Groups matching res/RegularTemplate.txt
// Note: This format depends on the order of keys in the data.
export const DEFAULT_REGEX = `<CharData>(?:[\\s\\S]*?"时间":\\s*"(?<Time>[^"]*)")?(?:[\\s\\S]*?"地点":\\s*"(?<Location>[^"]*)")?(?:[\\s\\S]*?"角色":\\s*"(?<Character>[^"]*)")?(?:[\\s\\S]*?"性格":\\s*"(?<Personality>[^"]*)")?(?:[\\s\\S]*?"年龄":\\s*"(?<Age>[^"]*)")?(?:[\\s\\S]*?"性别":\\s*"?(?<Gender>[^\\n,"]*)"?)?(?:[\\s\\S]*?"能力":\\s*"(?<Ability>[^"]*)")?(?:[\\s\\S]*?"等级":\\s*"(?<Level>[^"]*)")?(?:[\\s\\S]*?"好感值":\\s*"(?<Favorability>\\d+)[^"]*")?(?:[\\s\\S]*?"性欲值":\\s*"(?<Libido>\\d+)[^"]*")?(?:[\\s\\S]*?"服装":\\s*"(?<Clothing>[^"]*)")?(?:[\\s\\S]*?"行为和姿势":\\s*"(?<Behavior>[^"]*)")?(?:[\\s\\S]*?"性器官反应":\\s*"(?<Reaction>[^"]*)")?(?:[\\s\\S]*?"内心的声音":\\s*"(?<InnerVoice>[^"]*)")?(?:[\\s\\S]*?"Tips":\\s*"(?<Tips>[^"]*)")?[\\s\\S]*?<\\/CharData>`;

export const DEFAULT_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
    <div style="font-family: 'Segoe UI', Roboto, sans-serif; background: linear-gradient(145deg, #1b151e, #2b2026); color: #e0e0e0; padding: 20px; border-radius: 12px; border: 1px solid #333; width: 100%; max-width: 350px; box-shadow: 0 8px 32px rgba(0,0,0,0.8); position: relative; overflow: hidden;">
                <!-- Left Color Bar -->
        <div style="position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: #e91e63;"></div>

        <!-- Meta: Time & Location -->
        <div style="display: flex; justify-content: space-between; font-size: 0.75em; color: #888; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px dashed rgba(255,255,255,0.1);">
            <div>🗓️ $<Time></div>
            <div>🌏 $<Location></div>
        </div>

        <!-- Header: Name & Level -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">
            <div style="font-size: 1.4em; font-weight: 900; color: #fff; letter-spacing: 1px;">$<Character></div>
            <div style="background: #e91e63; color: #fff; padding: 2px 12px; border-radius: 4px; font-size: 0.8em; font-weight: bold;">LV. $<Level></div>
        </div>

        <!-- Info Grid -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.85em; margin-bottom: 15px;">
            <div style="grid-column: span 2; color: #aaa;">🌺 $<Age></div>
            <div style="grid-column: span 2; color: #aaa;">💋 $<Gender></div>
            <div style="grid-column: span 2; border-top: 1px solid #333; padding-top: 5px; margin-top: 5px; color: #64b5f6;">🧠 $<Personality></div>
            <div style="grid-column: span 2; color: #81c784;">⚡ $<Ability></div>
        </div>

        <!-- Affection Bar -->
        <div style="margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.7em; margin-bottom: 4px; color: #f06292;">
                <span>💞 好感值</span>
                <span>$<Favorability>%</span>
            </div>
            <div style="height: 6px; background: #111; border-radius: 3px;">
                <div style="width: $<Favorability>%; height: 100%; background: #f06292; box-shadow: 0 0 8px rgba(240,98,146,0.6);"></div>
            </div>
        </div>

        <!-- Libido Bar -->
        <div style="margin-bottom: 15px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.7em; margin-bottom: 4px; color: #ba68c8;">
                <span>💜 性欲值</span>
                <span>$<Libido>%</span>
            </div>
            <div style="height: 6px; background: #111; border-radius: 3px;">
                <div style="width: $<Libido>%; height: 100%; background: #ba68c8; box-shadow: 0 0 8px rgba(186,104,200,0.6);"></div>
            </div>
        </div>

        <!-- Internal Thoughts -->
        <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 6px; font-size: 0.85em; border-left: 2px solid #4db6ac; margin-bottom: 10px;">
            <div style="color: #4db6ac; font-size: 0.7em; font-weight: bold; margin-bottom: 3px;">🤔 内心的声音</div>
            <div style="font-style: italic; color: #ccc;">"$<InnerVoice>"</div>
        </div>

        <!-- Clothing & Behavior -->
        <div style="font-size: 0.75em; color: #777; line-height: 1.4; margin-bottom: 8px; border-bottom: 1px solid #333; padding-bottom: 8px;">
                        <strong style="color: #81d4fa;">👚 服装:</strong> $<Clothing><br/>
            <strong style="color: #a5d6a7;">💑 行为和姿势:</strong> $<Behavior>
        </div>

        <!-- Status & Reaction -->
        <div style="font-size: 0.75em; color: #777; line-height: 1.4;">
                        <strong style="color: #ffb74d;">🙀 Tips:</strong> $<Tips><br/>
            <strong style="color: #aaa;">🐈 性器官反应:</strong> $<Reaction>
        </div>
    </div>
</body>
</html>`;

export const DEFAULT_INPUT_TEXT = `时间：GU7738年10月22日|深夜|03:41
地点：苍白之月城地下-欢愉地牢-审讯室
角色：莫蕾
性格：SJ（施虐激进），乐子人，带有强烈的支配欲
年龄：307岁（外表28岁成熟御姐）
性别：Futanari（青蓝色肌，拥有巨型性器）
能力：黑暗束缚，信息素压制，鞭挞精通
等级：45（精英）
好感值：15 (发现了有趣的玩具，想要通过羞辱和调教来观察反应)
性欲值：40/100 (被猎物的气味刺激到，处于兴奋的预热阶段)
服装：黑色皮质情趣拘束装，过膝黑丝，尖头高跟鞋，大部分皮肤裸露
行为和姿势：单脚踩在Antlion身侧的墙上，身体前倾压迫，展示勃起的性器
性器官反应：完全勃起（40CM），马眼不断分泌出具有催情效果的前列腺液
内心的声音：这小家伙闻起来真不错，那种纯净的人类味道……把他玩坏一定很有趣。先用药水还是先用身体呢？呵呵呵……
Tips：她的体液具有极强的成瘾性和催情效果，皮肤接触也会导致微量Debuff叠加。`;