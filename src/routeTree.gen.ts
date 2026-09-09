/* eslint-disable */
// @ts-nocheck
import { Route as rootRouteImport } from './routes/__root'
import { Route as StudioRouteImport } from './routes/studio'
import { Route as SitemapDotxmlRouteImport } from './routes/sitemap[.]xml'
import { Route as ShopRouteImport } from './routes/shop'
import { Route as LoginRouteImport } from './routes/login'
import { Route as InviteRouteImport } from './routes/invite'
import { Route as GamesRouteImport } from './routes/games'
import { Route as FriendsRouteImport } from './routes/friends'
import { Route as ArcadeRouteImport } from './routes/arcade'
import { Route as IndexRouteImport } from './routes/index'
import { Route as RoomCodeRouteImport } from './routes/room.$code'
import { Route as PlaySlugRouteImport } from './routes/play.$slug'
import { Route as AdminEmotesRouteImport } from './routes/admin.emotes'
import { Route as AdminAnnouncementsRouteImport } from './routes/admin.announcements'
import { Route as AdminAiRouteImport } from './routes/admin.ai'
import { Route as MiniTypeCodeRouteImport } from './routes/mini.$type.$code'
import { Route as CreateGameRouteImport } from './routes/create-game'
import { Route as MyGamesRouteImport } from './routes/my-games'
import { Route as GameInviteTokenRouteImport } from './routes/game-invite.$token'
import { Route as GameEditorGameIdRouteImport } from './routes/game-editor.$gameId'

const make = (r: any, id: string, path: string) => r.update({ id, path, getParentRoute: () => rootRouteImport } as any)
const StudioRoute = make(StudioRouteImport, '/studio', '/studio')
const SitemapDotxmlRoute = make(SitemapDotxmlRouteImport, '/sitemap.xml', '/sitemap.xml')
const ShopRoute = make(ShopRouteImport, '/shop', '/shop')
const LoginRoute = make(LoginRouteImport, '/login', '/login')
const InviteRoute = make(InviteRouteImport, '/invite', '/invite')
const GamesRoute = make(GamesRouteImport, '/games', '/games')
const FriendsRoute = make(FriendsRouteImport, '/friends', '/friends')
const ArcadeRoute = make(ArcadeRouteImport, '/arcade', '/arcade')
const IndexRoute = make(IndexRouteImport, '/', '/')
const RoomCodeRoute = make(RoomCodeRouteImport, '/room/$code', '/room/$code')
const PlaySlugRoute = make(PlaySlugRouteImport, '/play/$slug', '/play/$slug')
const AdminEmotesRoute = make(AdminEmotesRouteImport, '/admin/emotes', '/admin/emotes')
const AdminAnnouncementsRoute = make(AdminAnnouncementsRouteImport, '/admin/announcements', '/admin/announcements')
const AdminAiRoute = make(AdminAiRouteImport, '/admin/ai', '/admin/ai')
const MiniTypeCodeRoute = make(MiniTypeCodeRouteImport, '/mini/$type/$code', '/mini/$type/$code')
const CreateGameRoute = make(CreateGameRouteImport, '/create-game', '/create-game')
const MyGamesRoute = make(MyGamesRouteImport, '/my-games', '/my-games')
const GameInviteTokenRoute = make(GameInviteTokenRouteImport, '/game-invite/$token', '/game-invite/$token')
const GameEditorGameIdRoute = make(GameEditorGameIdRouteImport, '/game-editor/$gameId', '/game-editor/$gameId')

export interface FileRoutesByFullPath {
  '/': typeof IndexRoute; '/arcade': typeof ArcadeRoute; '/friends': typeof FriendsRoute; '/games': typeof GamesRoute; '/invite': typeof InviteRoute; '/login': typeof LoginRoute; '/shop': typeof ShopRoute; '/sitemap.xml': typeof SitemapDotxmlRoute; '/studio': typeof StudioRoute; '/create-game': typeof CreateGameRoute; '/my-games': typeof MyGamesRoute; '/game-invite/$token': typeof GameInviteTokenRoute; '/game-editor/$gameId': typeof GameEditorGameIdRoute; '/admin/ai': typeof AdminAiRoute; '/admin/announcements': typeof AdminAnnouncementsRoute; '/admin/emotes': typeof AdminEmotesRoute; '/play/$slug': typeof PlaySlugRoute; '/room/$code': typeof RoomCodeRoute; '/mini/$type/$code': typeof MiniTypeCodeRoute
}
export interface FileRoutesByTo extends FileRoutesByFullPath {}
export interface FileRoutesById extends FileRoutesByFullPath { __root__: typeof rootRouteImport }
export interface FileRouteTypes { fileRoutesByFullPath: FileRoutesByFullPath; fullPaths: keyof FileRoutesByFullPath; fileRoutesByTo: FileRoutesByTo; to: keyof FileRoutesByTo; id: keyof FileRoutesById; fileRoutesById: FileRoutesById }
export interface RootRouteChildren { IndexRoute: typeof IndexRoute; ArcadeRoute: typeof ArcadeRoute; FriendsRoute: typeof FriendsRoute; GamesRoute: typeof GamesRoute; InviteRoute: typeof InviteRoute; LoginRoute: typeof LoginRoute; ShopRoute: typeof ShopRoute; SitemapDotxmlRoute: typeof SitemapDotxmlRoute; StudioRoute: typeof StudioRoute; AdminAiRoute: typeof AdminAiRoute; AdminAnnouncementsRoute: typeof AdminAnnouncementsRoute; AdminEmotesRoute: typeof AdminEmotesRoute; PlaySlugRoute: typeof PlaySlugRoute; RoomCodeRoute: typeof RoomCodeRoute; MiniTypeCodeRoute: typeof MiniTypeCodeRoute; CreateGameRoute: typeof CreateGameRoute; MyGamesRoute: typeof MyGamesRoute; GameInviteTokenRoute: typeof GameInviteTokenRoute; GameEditorGameIdRoute: typeof GameEditorGameIdRoute }
declare module '@tanstack/react-router' { interface FileRoutesByPath {
  '/': { id:'/'; path:'/'; fullPath:'/'; preLoaderRoute:typeof IndexRouteImport; parentRoute:typeof rootRouteImport }
  '/arcade': { id:'/arcade'; path:'/arcade'; fullPath:'/arcade'; preLoaderRoute:typeof ArcadeRouteImport; parentRoute:typeof rootRouteImport }
  '/friends': { id:'/friends'; path:'/friends'; fullPath:'/friends'; preLoaderRoute:typeof FriendsRouteImport; parentRoute:typeof rootRouteImport }
  '/games': { id:'/games'; path:'/games'; fullPath:'/games'; preLoaderRoute:typeof GamesRouteImport; parentRoute:typeof rootRouteImport }
  '/invite': { id:'/invite'; path:'/invite'; fullPath:'/invite'; preLoaderRoute:typeof InviteRouteImport; parentRoute:typeof rootRouteImport }
  '/login': { id:'/login'; path:'/login'; fullPath:'/login'; preLoaderRoute:typeof LoginRouteImport; parentRoute:typeof rootRouteImport }
  '/shop': { id:'/shop'; path:'/shop'; fullPath:'/shop'; preLoaderRoute:typeof ShopRouteImport; parentRoute:typeof rootRouteImport }
  '/sitemap.xml': { id:'/sitemap.xml'; path:'/sitemap.xml'; fullPath:'/sitemap.xml'; preLoaderRoute:typeof SitemapDotxmlRouteImport; parentRoute:typeof rootRouteImport }
  '/studio': { id:'/studio'; path:'/studio'; fullPath:'/studio'; preLoaderRoute:typeof StudioRouteImport; parentRoute:typeof rootRouteImport }
  '/create-game': { id:'/create-game'; path:'/create-game'; fullPath:'/create-game'; preLoaderRoute:typeof CreateGameRouteImport; parentRoute:typeof rootRouteImport }
  '/my-games': { id:'/my-games'; path:'/my-games'; fullPath:'/my-games'; preLoaderRoute:typeof MyGamesRouteImport; parentRoute:typeof rootRouteImport }
  '/game-invite/$token': { id:'/game-invite/$token'; path:'/game-invite/$token'; fullPath:'/game-invite/$token'; preLoaderRoute:typeof GameInviteTokenRouteImport; parentRoute:typeof rootRouteImport }
  '/game-editor/$gameId': { id:'/game-editor/$gameId'; path:'/game-editor/$gameId'; fullPath:'/game-editor/$gameId'; preLoaderRoute:typeof GameEditorGameIdRouteImport; parentRoute:typeof rootRouteImport }
  '/admin/ai': { id:'/admin/ai'; path:'/admin/ai'; fullPath:'/admin/ai'; preLoaderRoute:typeof AdminAiRouteImport; parentRoute:typeof rootRouteImport }
  '/admin/announcements': { id:'/admin/announcements'; path:'/admin/announcements'; fullPath:'/admin/announcements'; preLoaderRoute:typeof AdminAnnouncementsRouteImport; parentRoute:typeof rootRouteImport }
  '/admin/emotes': { id:'/admin/emotes'; path:'/admin/emotes'; fullPath:'/admin/emotes'; preLoaderRoute:typeof AdminEmotesRouteImport; parentRoute:typeof rootRouteImport }
  '/play/$slug': { id:'/play/$slug'; path:'/play/$slug'; fullPath:'/play/$slug'; preLoaderRoute:typeof PlaySlugRouteImport; parentRoute:typeof rootRouteImport }
  '/room/$code': { id:'/room/$code'; path:'/room/$code'; fullPath:'/room/$code'; preLoaderRoute:typeof RoomCodeRouteImport; parentRoute:typeof rootRouteImport }
  '/mini/$type/$code': { id:'/mini/$type/$code'; path:'/mini/$type/$code'; fullPath:'/mini/$type/$code'; preLoaderRoute:typeof MiniTypeCodeRouteImport; parentRoute:typeof rootRouteImport }
} }
const rootRouteChildren: RootRouteChildren = { IndexRoute, ArcadeRoute, FriendsRoute, GamesRoute, InviteRoute, LoginRoute, ShopRoute, SitemapDotxmlRoute, StudioRoute, AdminAiRoute, AdminAnnouncementsRoute, AdminEmotesRoute, PlaySlugRoute, RoomCodeRoute, MiniTypeCodeRoute, CreateGameRoute, MyGamesRoute, GameInviteTokenRoute, GameEditorGameIdRoute }
export const routeTree = rootRouteImport._addFileChildren(rootRouteChildren)._addFileTypes<FileRouteTypes>()
import type { getRouter } from './router.tsx'
import type { startInstance } from './start.ts'
declare module '@tanstack/react-start' { interface Register { ssr:true; router:Awaited<ReturnType<typeof getRouter>>; config:Awaited<ReturnType<typeof startInstance.getOptions>> } }
