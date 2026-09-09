import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useContent } from '../content/catalog.ts'
import {
  PIC_EXIT_TIME,
  PIC_OPEN_TIME,
  SCROLL_BELT_FADE,
  SCROLL_BELT_SCALE,
  SCROLL_BELT_TILT,
  SCROLL_STICK,
  SCROLL_STICK_DURATION,
  SCROLL_TRAVEL,
} from '../content/debug.ts'
import { filled, type CardCopy, type CardPic } from '../content/types.ts'
import { CARD_Z, NAV_Z, cardTravel, type ZWindow } from '../content/zMap.ts'
import { useScrollProgress } from '../hooks/useScrollProgress.ts'
import { useI18n } from '../i18n/context.ts'
import { SECTIONS, type SectionId } from '../scene/stations.ts'
import { imageFile, track } from '../analytics.ts'
import { useAppState } from './AppState.tsx'
import { ContactList } from './ContactList.tsx'
import { StackFlow } from './StackFlow.tsx'

type Box = { left: number; top: number; width: number; height: number }

type PicOpen = {
  src: string
  origin: Box
  /** Only the horizontal placement: CSS centers the frame vertically. */
  left: number
  size: number
}

function boxOf(el: Element): Box {
  const r = el.getBoundingClientRect()
  return { left: r.left, top: r.top, width: r.width, height: r.height }
}

function measureOpen(shot: HTMLButtonElement, src: string): PicOpen {
  // The button, not the image inside it: both ends of the zoom now carry the same 3px
  // frame, so mapping outer box to outer box keeps the borders on top of each other.
  const origin = boxOf(shot)
  const panel = shot.closest('.panel')
  const card = panel ? boxOf(panel) : origin
  // clientWidth/Height, not innerWidth/Height: same box a fixed element is laid out in,
  // which on mobile is what the URL bar shifts around.
  const root = document.documentElement
  const mobile = root.clientWidth <= 768
  // Mobile cards sit inside a narrow gutter, so the photo borrows it back.
  const avail = mobile ? root.clientWidth - 12 : card.width
  const size = Math.min(avail, Math.max(160, root.clientHeight - 48))
  return {
    src,
    origin,
    left: mobile
      ? (root.clientWidth - size) / 2
      : card.left + (card.width - size) / 2,
    size,
  }
}

function invertTransform(origin: Box, dest: Box): string {
  const dx = origin.left - dest.left
  const dy = origin.top - dest.top
  const sx = origin.width / dest.width
  const sy = origin.height / dest.height
  return `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`
}

const PIC_OPEN_MS = Math.max(0, PIC_OPEN_TIME) * 1000
const PIC_EXIT_MS = Math.max(0, PIC_EXIT_TIME) * 1000
const PIC_EASE_OPEN = 'cubic-bezier(0.22, 1, 0.36, 1)'
// Has to move on the first frame after the tap. A steeper ease-in reads as lag no matter
// how short the duration is, because a dismissal is judged on how fast it answers.
const PIC_EASE_EXIT = 'cubic-bezier(0.4, 0, 0.2, 1)'

/**
 * Web Animations rather than a CSS transition: the frame mounts already at its final
 * geometry, so there is no reliable "before" style to transition from, and the close has
 * to finish before the modal can unmount. The destination is measured off the live
 * element, so CSS owns the layout and the zoom still lands exactly on it.
 *
 * This one ignores `prefers-reduced-motion` on purpose — PIC_OPEN_TIME / PIC_EXIT_TIME
 * in debug.ts are the switch, and 0 turns it off.
 */
function PicModal({ open, onClose }: { open: PicOpen; onClose: () => void }) {
  const frameRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const openAnimRef = useRef<Animation | null>(null)
  const destRef = useRef<Box | null>(null)
  const closingRef = useRef(false)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useLayoutEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const dest = boxOf(frame)
    destRef.current = dest
    if (PIC_OPEN_MS <= 0) return
    openAnimRef.current = frame.animate(
      [{ transform: invertTransform(open.origin, dest) }, { transform: 'none' }],
      { duration: PIC_OPEN_MS, easing: PIC_EASE_OPEN, fill: 'both' },
    )
    backdropRef.current?.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: PIC_OPEN_MS,
      easing: 'ease',
      fill: 'both',
    })
    return () => openAnimRef.current?.cancel()
  }, [open])

  const dismissRef = useRef(() => {})
  dismissRef.current = () => {
    if (closingRef.current) return
    closingRef.current = true
    const frame = frameRef.current
    const dest = destRef.current
    if (!frame || !dest || PIC_EXIT_MS <= 0) {
      closeRef.current()
      return
    }

    let done = false
    const finish = () => {
      if (done) return
      done = true
      closeRef.current()
    }

    // Mid-zoom, rewind what is already playing; once it has settled, a fresh animation is
    // safe because the value it holds is the base style anyway.
    const opening = openAnimRef.current
    if (opening && opening.playState === 'running') {
      opening.onfinish = finish
      opening.updatePlaybackRate(-Math.max(0.2, PIC_OPEN_MS / Math.max(1, PIC_EXIT_MS)))
    } else {
      const exit = frame.animate(
        [{ transform: 'none' }, { transform: invertTransform(open.origin, dest) }],
        { duration: PIC_EXIT_MS, easing: PIC_EASE_EXIT, fill: 'forwards' },
      )
      exit.onfinish = finish
    }

    backdropRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: PIC_EXIT_MS,
      easing: 'ease-in',
      fill: 'forwards',
    })
    window.setTimeout(finish, PIC_EXIT_MS + 120)
  }

  useEffect(() => {
    // Clicking the thumbnail focuses it, which can nudge the page; only a real scroll
    // past that nudge counts as a dismissal.
    const from = window.scrollY
    const onScroll = () => {
      if (Math.abs(window.scrollY - from) > 4) dismissRef.current()
    }
    const onWheel = () => dismissRef.current()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismissRef.current()
    }
    const armed = window.setTimeout(() => {
      window.addEventListener('scroll', onScroll, { passive: true })
      window.addEventListener('wheel', onWheel, { passive: true })
      window.addEventListener('touchmove', onWheel, { passive: true })
    }, 220)
    window.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(armed)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchmove', onWheel)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  return createPortal(
    <div className="pic-modal" onClick={() => dismissRef.current()} role="presentation">
      <div className="pic-modal__backdrop" ref={backdropRef} />
      <div
        className="pic-modal__frame"
        ref={frameRef}
        style={{ left: open.left, width: open.size, height: open.size }}
      >
        <img alt="" className="pic-modal__img" src={open.src} />
      </div>
    </div>,
    document.body,
  )
}

function ShotList({
  pics,
  fit,
  onOpen,
}: {
  pics: CardPic[]
  fit: CardPic['fit']
  onOpen: (open: PicOpen) => void
}) {
  const { t } = useI18n()
  const key = fit === 'horizontal' ? 'h' : 'v'
  return (
    <div className={`panel__pics panel__pics--${key}`}>
      {pics.map((pic, i) => (
        <button
          aria-label={t('pic.open_aria')}
          className="panel__shot"
          key={`${pic.src}-${i}`}
          onClick={(event) => {
            const shot = event.currentTarget
            track('image', {
              file: imageFile(pic.src),
              section: shot.closest('[data-section]')?.getAttribute('data-section') ?? '',
            })
            onOpen(measureOpen(shot, pic.src))
          }}
          type="button"
        >
          <img alt="" className="panel__shot-img" src={pic.src} />
        </button>
      ))}
    </div>
  )
}

function CardBody({
  eyebrow,
  title,
  subtitle,
  text,
  pics,
  heading: Heading,
  children,
  onOpenPic,
}: CardCopy & {
  heading: 'h1' | 'h2'
  children?: ReactNode
  onOpenPic: (open: PicOpen) => void
}) {
  const shots = pics.filter((pic) => filled(pic.src))
  const wide = shots.filter((pic) => pic.fit === 'horizontal')
  const tall = shots.filter((pic) => pic.fit === 'vertical')
  const hasMain = filled(subtitle) || filled(text) || Boolean(children)

  return (
    <>
      {filled(eyebrow) ? <p className="eyebrow">{eyebrow}</p> : null}
      {/* Outside the split: the title gets the full width and the tall pic starts below it. */}
      {filled(title) ? <Heading className="panel__title">{title}</Heading> : null}
      {hasMain || tall.length > 0 ? (
        <div className={tall.length > 0 ? 'panel__body panel__body--split' : 'panel__body'}>
          <div className="panel__main">
            {filled(subtitle) ? <p className="lede">{subtitle}</p> : null}
            {children}
            {filled(text) ? <p className="copy">{text}</p> : null}
          </div>
          {tall.length > 0 ? (
            <ShotList fit="vertical" onOpen={onOpenPic} pics={tall} />
          ) : null}
        </div>
      ) : null}
      {wide.length > 0 ? (
        <ShotList fit="horizontal" onOpen={onOpenPic} pics={wide} />
      ) : null}
    </>
  )
}

/** Module scope on purpose: a card unmounts while offstage, so component state would reset. */
const shinePlayed = new Set<SectionId>()

/** True from the first time the card parks at center, so the eyebrow sweep plays once. */
function useEyebrowShine(id: SectionId, parked: boolean): boolean {
  const [shine, setShine] = useState(false)

  useEffect(() => {
    if (!parked || shinePlayed.has(id)) return
    shinePlayed.add(id)
    setShine(true)
  }, [id, parked])

  return shine
}

/**
 * Pose on the belt for `lean`: −1 at the top of the screen, 0 parked at center, 1 at the
 * bottom. Rides a quarter circle rather than `Math.abs(lean)`, whose derivative flips sign
 * at the center — that kink is what reads as the card hitting a corner. `1 - cos` arrives
 * flat at the center and rounds off at the edges.
 *
 * `tilt` is negated so the far edge is the one leaning away (convex belt). Drop the minus
 * to curve it the other way.
 */
function beltPose(lean: number): { opacity: number; scale: number; tilt: number } {
  const theta = lean * (Math.PI / 2)
  const recede = 1 - Math.cos(theta)

  return {
    opacity: 1 - (1 - SCROLL_BELT_FADE) * recede,
    scale: 1 - (1 - SCROLL_BELT_SCALE) * recede,
    tilt: -SCROLL_BELT_TILT * Math.sin(theta),
  }
}

function CardSlot({
  id,
  z,
  window,
  ghost,
  reach,
  children,
}: {
  id: SectionId
  z: number
  window: ZWindow | undefined
  ghost?: boolean
  reach: number
  children: ReactNode
}) {
  if (!window) return null
  const travel = cardTravel(z, window.start, window.end, SCROLL_STICK_DURATION, reach)
  const shine = useEyebrowShine(id, travel === 0)
  if (travel === null) return null

  const lean = reach > 0 ? Math.max(-1, Math.min(1, travel / reach)) : 0
  const { opacity, scale, tilt } = beltPose(lean)

  return (
    <article
      className="document__card"
      data-section={id}
      data-shine={shine ? '' : undefined}
      style={{
        opacity,
        // Translate first so the fold math stays in unscaled space; the rest pivots
        // around the card's own center.
        transform: [
          `translate3d(0, calc(${travel} * (50vh + 50%)), 0)`,
          `rotateX(${tilt}deg)`,
          `scale(${scale})`,
        ].join(' '),
      }}
    >
      <div className={ghost ? 'panel panel--ghost' : 'panel'}>{children}</div>
    </article>
  )
}

export function SectionCopy() {
  const z = useScrollProgress()
  const reach = SCROLL_STICK > 0 ? SCROLL_TRAVEL : 0
  const { setSelectedProjectId } = useAppState()
  const { t } = useI18n()
  const { identity, intro, about, projects, stack, contact, interests } = useContent()
  const [openPic, setOpenPic] = useState<PicOpen | null>(null)

  return (
    <main className="document">
      <div aria-hidden className="document__runway">
        {SECTIONS.flatMap((section) => {
          // Read once and branch on the local: a filter() first would not narrow
          // the second lookup, since NAV_Z is a Partial record.
          const top = NAV_Z[section.id]
          if (top === undefined) return []
          return [
            <span
              className="document__anchor"
              id={section.id}
              key={section.id}
              style={{ top: `${top * 100}%` }}
            />,
          ]
        })}
      </div>
      <div className="document__stage">
        <CardSlot ghost id="intro" reach={reach} window={CARD_Z.intro} z={z}>
          <CardBody
            heading="h1"
            onOpenPic={setOpenPic}
            {...intro}
          />
        </CardSlot>

        <CardSlot id="about" reach={reach} window={CARD_Z.about} z={z}>
          <CardBody
            heading="h2"
            onOpenPic={setOpenPic}
            {...about}
          />
        </CardSlot>

        <CardSlot id="interests" reach={reach} window={CARD_Z.interests} z={z}>
          <CardBody
            heading="h2"
            onOpenPic={setOpenPic}
            {...interests}
          >
            <ul className="interest-list">
              {interests.items.map((item) => (
                <li key={item.name}>
                  {filled(item.href) ? (
                    <a
                      className="interest-row"
                      href={item.href}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <span aria-hidden className="interest-row__icon">
                        {item.icon}
                      </span>
                      <span className="interest-row__name">
                        {item.name}
                        <span aria-hidden className="interest-row__out">
                          ↗
                        </span>
                      </span>
                    </a>
                  ) : (
                    <span className="interest-row">
                      <span aria-hidden className="interest-row__icon">
                        {item.icon}
                      </span>
                      <span className="interest-row__name">{item.name}</span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </CardBody>
        </CardSlot>

        <CardSlot id="projects" reach={reach} window={CARD_Z.projects} z={z}>
          <CardBody
            heading="h2"
            onOpenPic={setOpenPic}
            {...projects}
          >
            {projects.items.length === 0 ? (
              <p className="hint">{t('hint.projects')}</p>
            ) : (
              <ul className="project-list">
                {projects.items.map((project) => {
                  // Same rule as the interest rows: a row is only interactive when
                  // there is something behind it. With summary, tags, href and year
                  // all empty, ProjectPanel can do nothing but repeat the title.
                  const opens =
                    filled(project.summary) ||
                    filled(project.href) ||
                    filled(project.year) ||
                    project.tags.length > 0

                  return (
                    <li key={project.id}>
                      {opens ? (
                        <button
                          className="project-row"
                          onClick={() => setSelectedProjectId(project.id)}
                          type="button"
                        >
                          <span className="project-row__title">{project.title}</span>
                          {filled(project.year) ? (
                            <span className="hud__dim">{project.year}</span>
                          ) : null}
                        </button>
                      ) : (
                        <span className="project-row">
                          <span className="project-row__title">{project.title}</span>
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </CardBody>
        </CardSlot>

        <CardSlot id="stack" reach={reach} window={CARD_Z.stack} z={z}>
          <CardBody
            heading="h2"
            onOpenPic={setOpenPic}
            {...stack}
          >
            {stack.flow.length === 0 ? (
              <p className="hint">{t('hint.stack')}</p>
            ) : (
              <StackFlow flow={stack.flow} />
            )}
          </CardBody>
        </CardSlot>

        <CardSlot id="contact" reach={reach} window={CARD_Z.contact} z={z}>
          <CardBody
            heading="h2"
            onOpenPic={setOpenPic}
            {...contact}
          >
            {contact.items.length === 0 ? (
              <p className="hint">{t('hint.email')}</p>
            ) : (
              <ContactList items={contact.items} socials={identity.socials} />
            )}
          </CardBody>
        </CardSlot>
      </div>
      {openPic ? (
        <PicModal onClose={() => setOpenPic(null)} open={openPic} />
      ) : null}
    </main>
  )
}
