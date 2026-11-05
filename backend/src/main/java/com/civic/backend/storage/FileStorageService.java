package com.civic.backend.storage;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Set;
import java.util.UUID;

/**
 * Stores uploaded complaint images on the local filesystem and returns a
 * public URL path. Simple by design; can be swapped for S3/object storage later.
 */
@Service
@Slf4j
public class FileStorageService {

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp");
    private static final long MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

    private final Path uploadDir;
    private final String publicPrefix;

    public FileStorageService(
            @Value("${app.upload.dir:uploads}") String uploadDirProp,
            @Value("${app.upload.public-prefix:/uploads}") String publicPrefix) {
        this.uploadDir = Paths.get(uploadDirProp).toAbsolutePath().normalize();
        this.publicPrefix = publicPrefix;
    }

    @PostConstruct
    public void init() {
        try {
            Files.createDirectories(uploadDir);
            log.info("Image upload directory ready at {}", uploadDir);
        } catch (IOException e) {
            throw new IllegalStateException("Could not create upload directory: " + uploadDir, e);
        }
    }

    /**
     * Validates and stores the file, returning the public URL path
     * (e.g. "/uploads/uuid.jpg").
     */
    public String store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Image file is required");
        }
        if (file.getSize() > MAX_SIZE_BYTES) {
            throw new IllegalArgumentException("Image must be 10MB or smaller");
        }

        String original = StringUtils.cleanPath(file.getOriginalFilename() == null ? "" : file.getOriginalFilename());
        String ext = StringUtils.getFilenameExtension(original);
        if (ext == null || !ALLOWED_EXTENSIONS.contains(ext.toLowerCase())) {
            throw new IllegalArgumentException("Only JPG, PNG or WEBP images are allowed");
        }

        String storedName = UUID.randomUUID() + "." + ext.toLowerCase();
        Path target = uploadDir.resolve(storedName).normalize();

        // Guard against path traversal.
        if (!target.getParent().equals(uploadDir)) {
            throw new IllegalArgumentException("Invalid file path");
        }

        try {
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to store image", e);
        }

        return publicPrefix + "/" + storedName;
    }

    public Path getUploadDir() {
        return uploadDir;
    }

    /**
     * Loads the raw bytes of a previously stored image, given the public URL
     * path this service returned from {@link #store} (e.g. "/uploads/uuid.jpg").
     * Returns null if the URL isn't a locally stored file (e.g. an external
     * demo image) or the file can't be read. Guards against path traversal.
     */
    public byte[] loadBytes(String publicUrl) {
        if (publicUrl == null || !publicUrl.startsWith(publicPrefix + "/")) {
            return null; // not a locally stored file (e.g. an external URL)
        }
        String name = StringUtils.cleanPath(publicUrl.substring((publicPrefix + "/").length()));
        Path target = uploadDir.resolve(name).normalize();
        if (!target.startsWith(uploadDir) || !Files.exists(target)) {
            return null;
        }
        try {
            return Files.readAllBytes(target);
        } catch (IOException e) {
            log.warn("Could not read stored image {}: {}", target, e.getMessage());
            return null;
        }
    }
}
