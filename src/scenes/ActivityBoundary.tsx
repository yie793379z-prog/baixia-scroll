import { Component, type ReactNode } from 'react';
export class ActivityBoundary extends Component<{children:ReactNode;onExit:()=>void},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?<><h2>这段互动暂时停下了。</h2><button className="primary" onClick={this.props.onExit}>继续行卷</button></>:this.props.children;}
}
