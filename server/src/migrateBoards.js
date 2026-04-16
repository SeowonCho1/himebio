import mongoose from "mongoose";
import { Board, BoardDisplayType } from "./models/Board.js";
import { BoardPost } from "./models/BoardPost.js";
import { Notice } from "./models/Notice.js";
import { Event } from "./models/Event.js";
import { Reference } from "./models/Reference.js";

/**
 * Board 문서가 없을 때 기본 3개 게시판 생성 + 기존 Notice/Event/Reference 글 이전
 */
export async function ensureBoardsAndMigrateFromLegacy() {
  if ((await Board.countDocuments()) > 0) return;

  console.log("[boards] creating default boards and migrating legacy posts…");

  const [noticesBoard, eventsBoard, refsBoard] = await Board.insertMany([
    {
      slug: "notices",
      title: "공지사항",
      subtitle: "주요 공지를 안내드립니다.",
      displayType: BoardDisplayType.TABLE,
      showSearch: true,
      sortOrder: 1,
      isActive: true,
    },
    {
      slug: "events",
      title: "이벤트",
      subtitle: "진행 중인 할인·프로모션 소식입니다.",
      displayType: BoardDisplayType.THUMBNAIL_LIST,
      showSearch: true,
      sortOrder: 2,
      isActive: true,
    },
    {
      slug: "references",
      title: "참고논문",
      subtitle: "실험 및 제품 관련 참고자료입니다.",
      displayType: BoardDisplayType.GALLERY,
      showSearch: true,
      sortOrder: 3,
      isActive: true,
    },
  ]);

  const notices = await Notice.find().lean();
  if (notices.length) {
    await BoardPost.insertMany(
      notices.map((n) => ({
        boardId: noticesBoard._id,
        title: n.title,
        summary: n.summary || "",
        content: n.content || "",
        thumbnailUrl: n.thumbnailUrl || "",
        isImportant: !!n.isImportant,
        isActive: n.isActive !== false,
      }))
    );
  }

  const events = await Event.find().lean();
  if (events.length) {
    await BoardPost.insertMany(
      events.map((e) => ({
        boardId: eventsBoard._id,
        title: e.title,
        summary: e.summary || "",
        content: e.content || "",
        thumbnailUrl: e.thumbnailUrl || "",
        isImportant: false,
        isActive: e.isActive !== false,
      }))
    );
  }

  const refs = await Reference.find().lean();
  if (refs.length) {
    await BoardPost.insertMany(
      refs.map((r) => ({
        boardId: refsBoard._id,
        title: r.title,
        summary: r.summary || "",
        content: r.content || "",
        thumbnailUrl: r.thumbnailUrl || "",
        youtubeUrl: r.youtubeUrl || "",
        isImportant: false,
        isActive: r.isActive !== false,
      }))
    );
  }

  console.log(`[boards] migrated notices=${notices.length} events=${events.length} references=${refs.length}`);
}
