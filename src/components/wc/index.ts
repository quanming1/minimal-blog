/** mb-* 组件库注册入口（见 docs/ui-analysis.md §11.2）
 * 由 Base.astro 的 module script 引入——Astro VT 脚本去重保证只执行一次；
 * customElements.get() 守卫幂等（VT 强制重跑场景不重复 define）
 */
import { MbDialog } from './mb-dialog'
import { MbToast } from './mb-toast'

if (!customElements.get('mb-dialog')) customElements.define('mb-dialog', MbDialog)
if (!customElements.get('mb-toast')) customElements.define('mb-toast', MbToast)
