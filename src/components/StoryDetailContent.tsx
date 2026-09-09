import { Descriptions, Divider, Flex, Space, Tag, Typography } from "antd";
import { StatusTag } from "./StatusTag";
import { compactNumber, formatDateShort } from "@/utils/format";
import type { Story } from "@/types/domain";

const { Paragraph, Title, Text } = Typography;

// Read-only render of a story's metadata + description.
// Used by the review detail page and the stories management drawer.
export function StoryDetailContent({ story }: { story: Story | null | undefined }) {
  if (!story) return null;
  return (
    <div>
      <Flex gap={16} wrap="wrap">
        <img
          src={story.coverImageUrl}
          alt={story.title}
          width={120}
          height={160}
          style={{ objectFit: "cover", borderRadius: 8, background: "#eee" }}
        />
        <div style={{ flex: 1, minWidth: 240 }}>
          <Title level={4} style={{ marginTop: 0, marginBottom: 4 }}>
            {story.title}
          </Title>
          <Text type="secondary">by {story.authorName}</Text>
          <div style={{ marginTop: 8 }}>
            <Space size={[4, 4]} wrap>
              <StatusTag value={story.status} />
              <Tag>{story.ageRating}</Tag>
              {story.genres.map((g) => (
                <Tag key={g} color="purple">
                  {g}
                </Tag>
              ))}
              {story.tags.map((t) => (
                <Tag key={t}>#{t}</Tag>
              ))}
            </Space>
          </div>
        </div>
      </Flex>

      <Divider style={{ margin: "16px 0" }} />

      <Descriptions size="small" column={2} bordered>
        <Descriptions.Item label="Public ID">{story.publicId}</Descriptions.Item>
        <Descriptions.Item label="Language">{story.language}</Descriptions.Item>
        <Descriptions.Item label="Chapters">{story.chapterCount}</Descriptions.Item>
        <Descriptions.Item label="Views">{compactNumber(story.viewCount)}</Descriptions.Item>
        <Descriptions.Item label="Follows">{compactNumber(story.followCount)}</Descriptions.Item>
        <Descriptions.Item label="Rating">
          {story.ratingAvg} ({compactNumber(story.ratingCount)})
        </Descriptions.Item>
        <Descriptions.Item label="Created">{formatDateShort(story.createdAt)}</Descriptions.Item>
        <Descriptions.Item label="Published">
          {formatDateShort(story.publishedAt)}
        </Descriptions.Item>
      </Descriptions>

      <Divider style={{ margin: "16px 0" }} />

      <Title level={5}>Description</Title>
      <Paragraph style={{ whiteSpace: "pre-wrap" }}>{story.description}</Paragraph>
    </div>
  );
}
