import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { acquisitionSource } from './gameplay-analytics-shared';
beforeEach(()=>{
  vi.resetModules();vi.stubEnv('PROD',true);vi.stubEnv('VITE_GAMEPLAY_ANALYTICS_MODE','preview');
  vi.stubGlobal('location',{hostname:'pr-54-multicolor-sweeper.jibunnha.workers.dev',pathname:'/',search:'?utm_source=share&utm_medium=share'});
  vi.stubGlobal('document',{referrer:''});
  const data=new Map();vi.stubGlobal('sessionStorage',{getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>data.set(k,v)});
  vi.stubGlobal('fetch',vi.fn(async()=>({ok:true})));
});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
describe('first opening tracking',()=>{
  it('counts a tab visit only once, including retries and StrictMode mounts',async()=>{
    const {trackGameplay}=await import('./gameplay-analytics');
    trackGameplay('visit');trackGameplay('visit');trackGameplay('first_cell_open',20,4);trackGameplay('first_cell_open',15,3);
    expect(fetch).toHaveBeenCalledTimes(2);
    const calls=vi.mocked(fetch).mock.calls;
    const first=JSON.parse(calls[1][1]!.body as string);
    expect(first).toMatchObject({event:'first_cell_open',source:'share',mineCount:20,colorCount:4});
    expect(Object.keys(first).sort()).toEqual(['colorCount','event','mineCount','session','source']);
    expect(calls[1][1]!.credentials).toBe('omit');
  });
  it.each(['resultPreview','effects-lab','social-demo','ranking-test','debug'])('excludes %s',async(key)=>{
    location.search=`?${key}=1`;const {trackGameplay}=await import('./gameplay-analytics');trackGameplay('first_cell_open');expect(fetch).not.toHaveBeenCalled();
  });
  it('never sends production traffic from a preview-enabled build',async()=>{
    location.hostname='mcsweeper.hanage.app';const {trackGameplay}=await import('./gameplay-analytics');trackGameplay('visit');expect(fetch).not.toHaveBeenCalled();
  });
  it('does not interrupt play when session storage or fetch throws',async()=>{
    vi.stubGlobal('sessionStorage',{getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}});
    vi.mocked(fetch).mockImplementation(()=>{throw Error('offline');});
    const {trackGameplay}=await import('./gameplay-analytics');expect(()=>trackGameplay('first_cell_open')).not.toThrow();
  });
  it('starts a new temporary visit after 30 minutes idle',async()=>{
    vi.spyOn(Date,'now').mockReturnValue(1000000);
    const {trackGameplay}=await import('./gameplay-analytics');trackGameplay('first_cell_open');
    vi.mocked(Date.now).mockReturnValue(1000000+31*60000);trackGameplay('first_cell_open');
    expect(fetch).toHaveBeenCalledTimes(4);vi.restoreAllMocks();
  });
});
it('uses fixed attribution categories without retaining raw inputs',()=>{
  expect(acquisitionSource('?utm_source=x&utm_medium=cpc','')).toBe('x_ads');
  expect(acquisitionSource('?utm_source=share&utm_medium=share','')).toBe('share');
  expect(acquisitionSource('','https://hanage.app/games/')).toBe('hub');
});
