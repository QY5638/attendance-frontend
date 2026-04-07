<template>
  <section class="empty-card">
    <p class="empty-card__eyebrow">契约预留</p>
    <h2>提示词模板</h2>
    <p class="empty-card__desc">
      当前页面入口已保留，但后端尚未提供可联调接口。本页不主动发请求，只展示冻结契约与后续接入范围。
    </p>

    <div class="empty-card__grid">
      <article>
        <strong>预期功能</strong>
        <p>展示模板场景、版本、状态、更新时间，并支持新增、编辑和状态切换。</p>
      </article>
      <article>
        <strong>当前阻塞</strong>
        <p>后端尚未落地提示词模板对外 Controller，前端无法进入真实联调。</p>
      </article>
    </div>

    <div class="empty-card__api-list">
      <span>/api/system/prompt/list</span>
      <span>/api/system/prompt/add</span>
      <span>/api/system/prompt/update</span>
      <span>/api/system/prompt/status</span>
    </div>
  </section>
</template>

<style scoped>
.empty-card {
  padding: 28px;
  border-radius: 24px;
  background: linear-gradient(145deg, #ffffff 0%, #eef2ff 100%);
  box-shadow: 0 18px 60px rgba(15, 23, 42, 0.08);
}

.empty-card__eyebrow {
  margin: 0 0 10px;
  color: #4f46e5;
  font-size: 13px;
  font-weight: 600;
}

.empty-card h2 {
  margin: 0;
  color: #0f172a;
}

.empty-card__desc {
  margin: 14px 0 20px;
  line-height: 1.8;
  color: #475569;
}

.empty-card__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 14px;
}

.empty-card__grid article {
  padding: 16px;
  border-radius: 18px;
  background: rgba(79, 70, 229, 0.08);
}

.empty-card__grid strong {
  color: #0f172a;
}

.empty-card__grid p {
  margin: 10px 0 0;
  color: #475569;
  line-height: 1.7;
}

.empty-card__api-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

.empty-card__api-list span {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.06);
  color: #334155;
  font-size: 13px;
}
</style>
