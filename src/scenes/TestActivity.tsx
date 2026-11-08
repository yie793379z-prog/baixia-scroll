import { useState } from 'react';
import type { ActivityProps } from './types';
export function TestActivity({scene,onComplete}:ActivityProps) {
  const [noticed,setNoticed]=useState(false);
  return <><span className="eyebrow test-label">TEST FIXTURE · 功能验证</span><h2>镜头靠近，归处不忘。</h2>
    <p>{scene.fictionDisclosure}</p><div className="test-step"><span>01</span><p>这里验证面板与记录流程，关闭后在当前地点继续行卷。</p></div>
    <label className="check-row"><input type="checkbox" checked={noticed} onChange={e=>setNoticed(e.target.checked)}/>我知道这是测试内容，不是文化知识</label>
    <button className="primary" disabled={!noticed} onClick={()=>onComplete({summary:'完成了一次 TEST 镜头往返；此记录不含历史或文化结论。',evidenceIds:[],testFixture:true})}>记录测试结果</button>
  </>;
}
