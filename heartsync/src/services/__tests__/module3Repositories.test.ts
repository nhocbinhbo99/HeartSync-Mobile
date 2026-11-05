import { SupabaseChatRepository } from '../supabaseFeatureRepositories';
import type { AppSupabaseClient } from '../supabase';
const row={id:'server',match_id:'match',sender_id:'user',client_message_id:'client',content:'hello',sent_at:'2026-11-04T00:00:00Z',read_at:null};
it('sends through the idempotent RPC with the unchanged client UUID',async()=>{
 const rpc=jest.fn().mockResolvedValue({data:row,error:null});
 const repo=new SupabaseChatRepository({rpc,auth:{getUser:async()=>({data:{user:{id:'user'}},error:null})}} as unknown as AppSupabaseClient);
 await repo.sendMessage({matchId:'match',clientMessageId:'client',content:' hello '});
 expect(rpc).toHaveBeenCalledWith('send_chat_message',{p_match_id:'match',p_client_message_id:'client',p_content:'hello'});
});
it('marks only the supplied viewed message IDs via the protected RPC',async()=>{
 const rpc=jest.fn().mockResolvedValue({error:null});const repo=new SupabaseChatRepository({rpc} as unknown as AppSupabaseClient);
 await repo.markRead('match',['viewed']);expect(rpc).toHaveBeenCalledWith('mark_messages_read',{p_match_id:'match',p_ids:['viewed']});
});
it('rejects an unsafe pagination cursor without issuing a query',async()=>{
 const chain={select:jest.fn().mockReturnThis(),eq:jest.fn().mockReturnThis(),order:jest.fn().mockReturnThis(),limit:jest.fn().mockReturnThis(),or:jest.fn()};
 const repo=new SupabaseChatRepository({from:()=>chain} as unknown as AppSupabaseClient);
 expect((await repo.listMessages('match','malformed|filter,injection')).ok).toBe(false);expect(chain.or).not.toHaveBeenCalled();
});
