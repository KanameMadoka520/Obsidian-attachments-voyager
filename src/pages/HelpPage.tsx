import { useLang } from '../App'

export default function HelpPage() {
  const tr = useLang()

  return (
    <div className="help-page">
      <h2>{tr.helpTitle}</h2>

      <section className="help-section">
        <h3>{tr.helpOverviewTitle}</h3>
        <p>{tr.helpOverviewBody}</p>
      </section>

      <section className="help-section">
        <h3>{tr.helpPrereqTitle}</h3>
        <p>{tr.helpPrereqIntro}</p>

        <div className="help-setting">
          <div className="help-setting-name">{tr.helpSettingAttachPath}</div>
          <div className="help-setting-value">{tr.helpSettingAttachPathValue}</div>
          <div className="help-setting-desc">{tr.helpSettingAttachPathDesc}</div>
        </div>

        <div className="help-setting">
          <div className="help-setting-name">{tr.helpSettingSubfolder}</div>
          <div className="help-setting-value">attachments</div>
          <div className="help-setting-desc">{tr.helpSettingSubfolderDesc}</div>
        </div>

        <div className="help-setting">
          <div className="help-setting-name">{tr.helpSettingLinkType}</div>
          <div className="help-setting-value">{tr.helpSettingLinkTypeValue}</div>
          <div className="help-setting-desc">{tr.helpSettingLinkTypeDesc}</div>
        </div>

        <div className="help-setting">
          <div className="help-setting-name">{tr.helpSettingWikiLink}</div>
          <div className="help-setting-value">{tr.helpSettingWikiLinkValue}</div>
          <div className="help-setting-desc">{tr.helpSettingWikiLinkDesc}</div>
        </div>

        <div className="help-setting">
          <div className="help-setting-name">{tr.helpSettingDelete}</div>
          <div className="help-setting-value">{tr.helpSettingDeleteValue}</div>
          <div className="help-setting-desc">{tr.helpSettingDeleteDesc}</div>
        </div>
      </section>

      <section className="help-section">
        <h3>{tr.helpScanTitle}</h3>
        <p>{tr.helpScanBody}</p>
      </section>

      <section className="help-section">
        <h3>{tr.helpGalleryTitle}</h3>
        <p>{tr.helpGalleryBody}</p>
      </section>

      <section className="help-section">
        <h3>{tr.helpStatsTitle}</h3>
        <p>{tr.helpStatsBody}</p>
      </section>

      <section className="help-section">
        <h3>{tr.helpWorkflowsTitle}</h3>
        <ul>
          <li>{tr.helpWorkflowScan}</li>
          <li>{tr.helpWorkflowBroken}</li>
          <li>{tr.helpWorkflowBackup}</li>
          <li>{tr.helpWorkflowDedup}</li>
          <li>{tr.helpWorkflowConvert}</li>
        </ul>
      </section>

      <section className="help-section">
        <h3>{tr.helpShortcutsTitle}</h3>
        <ul>
          <li>{tr.helpShortcutSearch}</li>
          <li>{tr.helpShortcutDelete}</li>
          <li>{tr.helpShortcutSelectAll}</li>
          <li>{tr.helpShortcutEscape}</li>
        </ul>
      </section>
    </div>
  )
}
