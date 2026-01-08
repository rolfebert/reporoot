-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RefreshToken` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `token` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `RefreshToken_token_key`(`token`),
    INDEX `RefreshToken_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Item` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `content` TEXT NULL,
    `ownerId` INTEGER NOT NULL,
    `nbsCode` VARCHAR(191) NULL,
    `division` VARCHAR(191) NULL,
    `section` INTEGER NULL,
    `sectionName` VARCHAR(191) NULL,
    `age` VARCHAR(191) NULL,
    `backType` VARCHAR(191) NULL,
    `pictorialSubject` VARCHAR(191) NULL,
    `pattern` VARCHAR(191) NULL,
    `usageType` VARCHAR(191) NULL,
    `material` VARCHAR(191) NULL,
    `size` VARCHAR(191) NULL,
    `diameter` VARCHAR(191) NULL,
    `color` VARCHAR(191) NULL,
    `holes` INTEGER NULL,
    `style` VARCHAR(191) NULL,
    `buttonCondition` VARCHAR(191) NULL,
    `manufacturer` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Item_ownerId_idx`(`ownerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ItemImage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `itemId` INTEGER NOT NULL,
    `url` VARCHAR(191) NULL,
    `imageData` LONGBLOB NULL,
    `contentType` VARCHAR(191) NULL,
    `fileSize` INTEGER NULL,
    `imageHash` VARCHAR(191) NULL,
    `originalFilename` VARCHAR(191) NULL,
    `analysisData` TEXT NULL,
    `label` VARCHAR(191) NULL,
    `imageOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ItemImage_imageHash_key`(`imageHash`),
    INDEX `ItemImage_itemId_idx`(`itemId`),
    INDEX `ItemImage_imageHash_idx`(`imageHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `RefreshToken` ADD CONSTRAINT `RefreshToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Item` ADD CONSTRAINT `Item_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ItemImage` ADD CONSTRAINT `ItemImage_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `Item`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
