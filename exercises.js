window.EXERCISES = [
  {
    id: "rdl",
    setupPoints: [
      {"joint": "foot", "label": "双脚踩稳", "text": "双脚约髋宽，脚跟和前脚掌均匀受力。"},
      {"joint": "knee", "label": "膝盖微屈", "text": "双膝稍稍放松，先站稳，再把髋部向后送。"},
      {"joint": "hand", "label": "杠贴大腿", "text": "双臂自然下垂，握住杠铃，让杠靠近大腿前侧。"}
    ],
    name: "罗马尼亚硬拉",
    en: "ROMANIAN DEADLIFT",
    equipment: ["杠铃"],
    region: "臀腿",
    level: "中级",
    muscles: ["腘绳肌", "臀大肌", "竖脊肌"],
    summary: "以髋部向后折叠为主，练习大腿后侧与臀部发力。",
    steps: [
      "双脚约髋宽站立，杠铃贴在大腿前侧，膝盖微屈并收紧躯干。",
      "臀部向后推，沿腿前侧下放杠铃；背部保持自然中立，感到大腿后侧拉伸即可。",
      "脚掌踩稳地面，臀部向前回到站立；顶端站直即可，不要向后挺腰。"
    ],
    checks: ["杠铃始终贴近双腿", "动作主要来自髋部后移，膝角变化较小", "腰背形状稳定，顶端不过度后仰"],
    mistakes: ["杠铃离腿太远", "屈膝过多变成深蹲", "弯腰下放或顶端反弓腰背"],
    sources: [{ label: "ACE 罗马尼亚硬拉动作说明", url: "https://www.acefitness.org/resources/everyone/exercise-library/317/romanian-deadlift/" }]
  },
  {
    id: "squat",
    setupPoints: [
      {"joint": "shoulder", "label": "杠放上背", "text": "让杠铃稳稳落在上背肌肉上，颈椎处留出空间。"},
      {"joint": "hand", "label": "双手握稳", "text": "双手对称握杠，轻收肩胛，让上背保持稳定。"},
      {"joint": "foot", "label": "脚掌踩实", "text": "双脚约肩宽，脚尖自然稍向外，站稳后再下蹲。"}
    ],
    name: "杠铃深蹲",
    en: "BARBELL BACK SQUAT",
    equipment: ["杠铃"],
    region: "臀腿",
    level: "中级",
    muscles: ["股四头肌", "臀大肌", "腘绳肌"],
    summary: "杠铃置于上背，髋膝同时屈伸完成蹲起。",
    steps: [
      "杠铃置于上背，双脚略宽于肩，脚尖自然外转；站稳后再从架上取杠。",
      "臀部向后下方坐，膝盖沿脚尖方向弯曲，躯干保持稳定，下蹲至可控深度。",
      "脚掌踩稳地面，伸髋伸膝站起，回到直立。"
    ],
    checks: ["膝盖与脚尖方向一致", "全程脚掌稳定着地", "下蹲深度以腰背稳定、动作可控为准"],
    mistakes: ["膝盖向内塌", "脚跟抬起或脚掌失去支撑", "下蹲时腰背失去稳定"],
    sources: [{ label: "ACE 杠铃背蹲动作说明", url: "https://www.acefitness.org/resources/everyone/exercise-library/11/back-squat/" }]
  },
  {
    id: "pushup",
    setupPoints: [
      {"joint": "hand", "label": "手掌撑地", "text": "双手略宽于肩，手掌张开压稳垫面。"},
      {"joint": "hip", "label": "髋部摆平", "text": "轻收腹和臀，从肩、髋到脚跟连成一条线。"},
      {"joint": "head", "label": "颈部放松", "text": "目光落在双手前方一点，让头颈顺着背部延伸。"}
    ],
    name: "俯卧撑",
    en: "PUSH-UP",
    equipment: ["自重", "瑜伽垫"],
    region: "胸部",
    level: "初级",
    muscles: ["胸大肌", "肱三头肌", "前三角肌", "核心"],
    summary: "保持身体像一块平板，屈肘降低身体后推回起始位。",
    steps: [
      "双手略宽于肩，手指朝前；双腿伸直，收紧腹部和臀部。",
      "屈肘缓慢下放胸口，肘部斜向身体后侧，头颈与躯干保持一线。",
      "推开地面，伸直手臂回到起始位；全程保持身体稳定。"
    ],
    checks: ["肩部大致位于手腕上方", "头、背、髋、腿保持一线", "下降与推起都平稳可控"],
    mistakes: ["腰部下沉或臀部翘起", "肘部过度向两侧张开", "只做很浅的快速弹动"],
    sources: [{ label: "ACE 俯卧撑动作说明", url: "https://www.acefitness.org/resources/everyone/exercise-library/41/push-up/" }]
  },
  {
    id: "row",
    setupPoints: [
      {"joint": "supportHand", "label": "单手撑凳", "text": "用支撑侧手掌压稳凳面，避免肩膀靠近耳朵。"},
      {"joint": "supportKnee", "label": "单膝落凳", "text": "同侧膝盖稳放凳面，另一只脚踩稳地面。"},
      {"joint": "workingHand", "label": "手臂垂下", "text": "动作侧手握哑铃，在肩膀下方自然垂下。"}
    ],
    name: "单臂哑铃划船",
    en: "SINGLE-ARM DUMBBELL ROW",
    equipment: ["哑铃", "哑铃凳"],
    region: "背部",
    level: "中级",
    muscles: ["背阔肌", "菱形肌", "斜方肌", "肱二头肌"],
    summary: "一手一膝支撑在凳上，单臂将哑铃拉向髋部。",
    steps: [
      "一手一膝支撑在训练凳上，另一手握哑铃；背部平直，躯干收紧。",
      "保持肩膀远离耳朵，将肘部沿身体侧面向后拉，哑铃靠近髋部。",
      "控制哑铃缓慢下放至手臂伸直，再完成下一次。"
    ],
    checks: ["躯干保持稳定，不随拉起旋转", "肘部贴近身体向后走", "哑铃下降有控制"],
    mistakes: ["借转体甩起哑铃", "耸肩或用手臂猛拽", "弓背或抬头过高"],
    sources: [{ label: "ACE 单臂哑铃划船动作说明", url: "https://www.acefitness.org/resources/everyone/exercise-library/126/single-arm-row/" }]
  },
  {
    id: "overhead",
    setupPoints: [
      {"joint": "foot", "label": "双脚站稳", "text": "双脚约髋宽，脚跟与前脚掌同时踩实。"},
      {"joint": "hand", "label": "哑铃到肩", "text": "哑铃置于肩旁，手腕伸直并与前臂对齐。"},
      {"joint": "core", "label": "收紧腹部", "text": "肋骨与骨盆上下对齐，推举前先稳住躯干。"}
    ],
    name: "站姿哑铃推举",
    en: "STANDING DUMBBELL OVERHEAD PRESS",
    equipment: ["哑铃"],
    region: "肩部",
    level: "中级",
    muscles: ["三角肌", "肱三头肌", "核心"],
    summary: "从肩旁将哑铃平稳推过头顶，躯干保持稳固。",
    steps: [
      "双脚约髋宽站立，双手持哑铃于肩旁，手腕保持平直。",
      "收紧腹部与臀部，将哑铃向上推至头顶上方，手臂伸直但不猛锁肘。",
      "控制哑铃沿原路径下降至肩旁，准备下一次推举。"
    ],
    checks: ["哑铃在肩部上方平稳移动", "手腕大致位于肘部上方", "腰背不随推举向后过度弯曲"],
    mistakes: ["挺腰借力或用腿蹬起", "手腕后折", "哑铃下放过快、失去控制"],
    sources: [{ label: "NASM 哑铃过头推举动作要点", url: "https://www.youtube.com/watch?v=MMjBnEBnZKM" }]
  },
  {
    id: "plank",
    setupPoints: [
      {"joint": "elbow", "label": "肘在肩下", "text": "前臂贴垫，手肘落在肩膀正下方。"},
      {"joint": "hip", "label": "髋部对齐", "text": "收紧腹部和臀部，让肩、髋和脚跟连成直线。"},
      {"joint": "foot", "label": "脚尖撑稳", "text": "双腿向后伸直，双脚脚尖压稳垫面。"}
    ],
    name: "前臂平板支撑",
    en: "FOREARM PLANK",
    equipment: ["自重", "瑜伽垫"],
    region: "核心",
    level: "初级",
    muscles: ["腹直肌", "腹斜肌", "臀大肌"],
    summary: "以前臂与脚尖支撑，维持头到脚跟的稳定直线。",
    steps: [
      "从四点支撑依次向后伸腿，双掌撑稳后逐侧放下前臂，肘部在肩膀下方。",
      "收紧腹部与臀部，抬起身体，使头、背、髋和脚跟大致成一直线。",
      "自然呼吸并稳住姿势；无法保持对齐时，主动放下休息。"
    ],
    checks: ["肩膀大致位于肘部上方", "髋部不下沉也不翘高", "持续呼吸，颈部顺着脊柱"],
    mistakes: ["塌腰或翘臀", "耸肩、头部下垂", "憋气硬撑导致姿势散掉"],
    sources: [{ label: "ACE 前臂平板支撑动作说明", url: "https://www.acefitness.org/resources/everyone/exercise-library/32/front-plank/" }]
  },
  {
    id: "curl",
    setupPoints: [
      {"joint": "foot", "label": "双脚站稳", "text": "站稳双脚，保持两侧受力均匀。"},
      {"joint": "elbow", "label": "肘贴身侧", "text": "上臂自然垂下，手肘靠近肋部。"},
      {"joint": "hand", "label": "掌心向前", "text": "双手握稳哑铃，掌心朝前，手腕保持平直。"}
    ],
    name: "站姿哑铃弯举",
    en: "STANDING DUMBBELL CURL",
    equipment: ["哑铃"],
    region: "手臂",
    level: "初级",
    muscles: ["肱二头肌", "肱肌", "前臂肌群"],
    summary: "固定上臂位置，通过屈肘将哑铃举向肩部。",
    steps: [
      "双脚约髋宽站立，双手持哑铃垂在身体两侧，掌心朝前。",
      "上臂贴近身体，屈肘将哑铃举向肩部，手腕保持平直。",
      "控制哑铃缓慢放回两侧，手臂接近伸直后重复。"
    ],
    checks: ["肘部大致留在身体两侧", "躯干保持直立稳定", "下放阶段同样缓慢"],
    mistakes: ["身体前后摆动借力", "肘部明显前移", "手腕弯折或快速砸下"],
    sources: [{ label: "ACE 弯举参考（坐姿变式）", url: "https://www.acefitness.org/resources/everyone/exercise-library/44/seated-biceps-curl/" }]
  },
  {
    id: "lunge",
    setupPoints: [
      {"joint": "foot", "label": "双脚分开", "text": "双脚约髋宽站立，给后撤的脚留出平衡空间。"},
      {"joint": "hip", "label": "骨盆朝前", "text": "骨盆左右摆平，髋部和胸口朝向正前方。"},
      {"joint": "core", "label": "躯干稳定", "text": "收紧腹部，站稳后再将一只脚向后迈出。"}
    ],
    name: "后撤弓步",
    en: "BODYWEIGHT REVERSE LUNGE",
    equipment: ["自重"],
    region: "臀腿",
    level: "初级",
    muscles: ["股四头肌", "臀大肌", "腘绳肌"],
    summary: "单脚向后迈步，屈膝下沉后以前脚踩地回到站立。",
    steps: [
      "双脚约髋宽站立，收紧躯干，目视前方。",
      "一脚向后迈步，前后屈膝下沉；前脚全脚掌踩稳，膝盖朝向脚尖。",
      "以前脚踩地，把后脚收回。本演示固定前后脚，练习时换侧重复。"
    ],
    checks: ["前脚全脚掌稳定着地", "前膝与脚尖方向一致", "躯干直立、骨盆朝前"],
    mistakes: ["前膝向内塌", "步幅过窄导致身体摇晃", "后脚蹬地过多、前脚失去支撑"],
    sources: [{ label: "NASM 后撤弓步动作说明", url: "https://www.nasm.org/resource-center/blog/squat-alternatives" }]
  },
  {
    id: "lateral",
    setupPoints: [
      {"joint": "shoulder", "label": "肩膀放松", "text": "肩膀远离耳朵，双臂放在身体两侧。"},
      {"joint": "elbow", "label": "手肘微屈", "text": "肘关节保留小幅弯曲，准备带动上臂抬起。"},
      {"joint": "hand", "label": "手腕伸直", "text": "双手握稳哑铃，手背与前臂大致在一条线上。"}
    ],
    name: "哑铃侧平举",
    en: "DUMBBELL LATERAL RAISE",
    equipment: ["哑铃"],
    region: "肩部",
    level: "初级",
    muscles: ["中三角肌", "冈上肌"],
    summary: "双臂从身体两侧抬起至肩高，重点保持轻重量与控制。",
    steps: [
      "双脚站稳，哑铃放在身体两侧；肘部微屈，躯干收紧。",
      "双臂向身体两侧抬起，肘与上臂带动，至肩部高度附近。",
      "控制双臂缓慢下放，回到身体两侧。"
    ],
    checks: ["手臂在身体两侧略向前的平面抬起", "肩膀不耸起，手腕保持自然", "身体不摇摆，重量可控"],
    mistakes: ["借助摆动甩起哑铃", "耸肩或抬得远高于肩部", "手腕折弯、肘部锁死"],
    sources: [{ label: "ACE 哑铃侧平举动作说明", url: "https://www.acefitness.org/resources/everyone/exercise-library/26/lateral-raise/" }]
  },
  {
    id: "bridge",
    setupPoints: [
      {"joint": "foot", "label": "双脚踩实", "text": "仰卧屈膝，双脚约髋宽踩地，脚跟靠近臀部。"},
      {"joint": "knee", "label": "膝对脚尖", "text": "两侧膝盖朝脚尖方向，保持约髋宽的间距。"},
      {"joint": "shoulder", "label": "肩背贴垫", "text": "上背和肩膀自然贴垫，双臂放在身体两侧。"}
    ],
    name: "臀桥",
    en: "GLUTE BRIDGE",
    equipment: ["自重", "瑜伽垫"],
    region: "臀腿",
    level: "初级",
    muscles: ["臀大肌", "腘绳肌", "核心"],
    summary: "仰卧屈膝，以臀部发力抬起骨盆，再控制下放。",
    steps: [
      "仰卧屈膝，双脚与髋同宽踩地，手臂放在身体两侧。",
      "收紧腹部，以脚跟踩地并夹紧臀部，将髋部抬至肩、髋、膝大致成线。",
      "控制髋部缓慢下放回地面，不要用腰部向上顶。"
    ],
    checks: ["膝盖大致朝向脚尖", "上抬时主要感到臀部发力", "顶端不过度挺腰"],
    mistakes: ["用腰背反弓顶高骨盆", "双膝向内夹", "脚离臀部太远导致腿后侧过度代偿"],
    sources: [{ label: "ACE 臀桥动作说明", url: "https://www.acefitness.org/resources/everyone/exercise-library/49/glute-bridge/" }]
  },
  {
    id: "calf",
    setupPoints: [
      {"joint": "foot", "label": "前脚掌踩稳", "text": "双脚约髋宽站好，大脚趾根与小脚趾根均匀踩地。"},
      {"joint": "ankle", "label": "脚踝对正", "text": "脚踝与脚尖方向一致，避免重心偏到脚的外缘。"},
      {"joint": "knee", "label": "双膝放松", "text": "双腿伸直，膝盖保持放松，身体重心位于两脚之间。"}
    ],
    name: "站姿提踵",
    en: "STANDING CALF RAISE",
    equipment: ["自重"],
    region: "臀腿",
    level: "初级",
    muscles: ["腓肠肌", "比目鱼肌"],
    summary: "站立将脚跟抬离地面，再缓慢回到地面。",
    steps: [
      "双脚约髋宽站立，脚尖朝前；需要时可用指尖轻扶固定支撑物。",
      "脚掌前部踩稳，缓慢抬起脚跟至舒适高度，短暂停留。",
      "控制脚跟缓慢下降，轻触地面后重复。"
    ],
    checks: ["双脚保持平行，重心均匀", "脚跟抬起与下降都可控", "膝盖保持自然，不锁死"],
    mistakes: ["弹震式快速提踵", "脚踝向内或向外歪斜", "借助上身摇晃完成动作"],
    sources: [{ label: "ACE 站姿徒手提踵动作说明", url: "https://www.acefitness.org/resources/everyone/exercise-library/73/standing-calf-raises-wall/" }]
  },
  {
    id: "bench",
    setupPoints: [
      {"joint": "foot", "label": "脚掌踩实", "text": "仰卧后双脚踩稳，臀部与凳面保持接触。"},
      {"joint": "shoulder", "label": "上背贴凳", "text": "肩胛轻轻向后收，让两肩和上背稳定靠在凳面上。"},
      {"joint": "hand", "label": "取杠对齐", "text": "对称握杠，取出后稳在肩部上方，手腕与前臂对齐。"}
    ],
    name: "杠铃卧推",
    en: "BARBELL BENCH PRESS",
    equipment: ["杠铃", "哑铃凳"],
    region: "胸部",
    level: "中级",
    muscles: ["胸大肌", "肱三头肌", "前三角肌"],
    summary: "仰卧于训练凳，控制杠铃下降至胸前，再推回上方。",
    steps: [
      "仰卧于训练凳，双脚踩稳地面，肩胛轻轻向后收；握距略宽于肩。",
      "稳定取杠后，控制杠铃下降至胸部附近，前臂大致竖直。",
      "将杠铃平稳推回肩部上方；结束时将杠铃稳妥放回架上。"
    ],
    checks: ["手腕大致位于肘部上方", "肩背与双脚保持稳定支撑", "杠铃不弹胸，下降和推起都可控"],
    mistakes: ["下放过快或杠铃撞击胸部", "肘部横向张得过开", "臀部离凳或腰背过度拱起"],
    sources: [{ label: "NASM 杠铃卧推动作说明", url: "https://www.nasm.org/resource-center/exercise-library/barbell-bench-press" }]
  }
];
