const Project = require('../models/project.model');
const fs = require('fs').promises;
const path = require('path');

class ProjectController {
    /**
     * Create a new project with auto-generated test environment
     * POST /api/projects
     */
    async createProject(req, res) {
        try {
            const { name, description, visibility = 'private' } = req.body;
            const userId = req.user.id; // Assuming user is authenticated

            if (!name) {
                return res.status(400).json({
                    success: false,
                    message: 'Project name is required'
                });
            }

            // Create slug from project name
            const slug = name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '') + '-' + Date.now();

            // Define test environment structure using direct method calls
            const testStructure = {
                name: 'test-automation',
                type: 'folder',
                children: [
                    {
                        name: 'src',
                        type: 'folder',
                        children: [
                            {
                                name: 'test',
                                type: 'folder',
                                children: [
                                    {
                                        name: 'java',
                                        type: 'folder',
                                        children: [
                                            {
                                                name: 'com',
                                                type: 'folder',
                                                children: [
                                                    {
                                                        name: 'automation',
                                                        type: 'folder',
                                                        children: [
                                                            {
                                                                name: 'tests',
                                                                type: 'folder',
                                                                children: [
                                                                    {
                                                                        name: 'SampleTest.java',
                                                                        type: 'file',
                                                                        content: this.getSampleTestContent()
                                                                    }
                                                                ]
                                                            },
                                                            {
                                                                name: 'pages',
                                                                type: 'folder',
                                                                children: [
                                                                    {
                                                                        name: 'BasePage.java',
                                                                        type: 'file',
                                                                        content: this.getBasePageContent()
                                                                    }
                                                                ]
                                                            },
                                                            {
                                                                name: 'utils',
                                                                type: 'folder',
                                                                children: [
                                                                    {
                                                                        name: 'DriverManager.java',
                                                                        type: 'file',
                                                                        content: this.getDriverManagerContent()
                                                                    },
                                                                    {
                                                                        name: 'ConfigReader.java',
                                                                        type: 'file',
                                                                        content: this.getConfigReaderContent()
                                                                    }
                                                                ]
                                                            },
                                                            {
                                                                name: 'api',
                                                                type: 'folder',
                                                                children: [
                                                                    {
                                                                        name: 'RestAssuredHelper.java',
                                                                        type: 'file',
                                                                        content: this.getRestAssuredHelperContent()
                                                                    },
                                                                    {
                                                                        name: 'ApiTest.java',
                                                                        type: 'file',
                                                                        content: this.getApiTestContent()
                                                                    }
                                                                ]
                                                            },
                                                            {
                                                                name: 'runners',
                                                                type: 'folder',
                                                                children: [
                                                                    {
                                                                        name: 'TestRunner.java',
                                                                        type: 'file',
                                                                        content: this.getTestRunnerContent()
                                                                    }
                                                                ]
                                                            }
                                                        ]
                                                    }
                                                ]
                                            }
                                        ]
                                    },
                                    {
                                        name: 'resources',
                                        type: 'folder',
                                        children: [
                                            {
                                                name: 'features',
                                                type: 'folder',
                                                children: [
                                                    {
                                                        name: 'sample.feature',
                                                        type: 'file',
                                                        content: this.getSampleFeatureContent()
                                                    }
                                                ]
                                            },
                                            {
                                                name: 'config',
                                                type: 'folder',
                                                children: [
                                                    {
                                                        name: 'config.properties',
                                                        type: 'file',
                                                        content: this.getConfigPropertiesContent()
                                                    }
                                                ]
                                            },
                                            {
                                                name: 'testng.xml',
                                                type: 'file',
                                                content: this.getTestNGXmlContent()
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        name: 'pom.xml',
                        type: 'file',
                        content: this.getPomXmlContent(name)
                    },
                    {
                        name: 'README.md',
                        type: 'file',
                        content: this.getReadmeContent(name)
                    },
                    {
                        name: '.gitignore',
                        type: 'file',
                        content: this.getGitIgnoreContent()
                    }
                ]
            };

            // Count files and folders
            const counts = this.countFilesAndFolders(testStructure);

            // Create project in database
            const project = new Project({
                name,
                slug,
                description,
                owner: userId,
                visibility,
                technology: {
                    language: 'java',
                    framework: 'spring-boot',
                    database: ['mongodb'],
                    orm: 'hibernate'
                },
                testConfig: {
                    framework: 'unified',
                    language: 'java',
                    buildTool: 'maven',
                    timeout: 30000,
                    retryCount: 2,
                    parallel: false,
                    threadCount: 1
                },
                testFolder: {
                    generated: true,
                    generatedAt: new Date(),
                    structure: testStructure,
                    rootPath: `/projects/${slug}/test-automation`,
                    totalFiles: counts.files,
                    totalFolders: counts.folders
                },
                status: 'active'
            });

            // Save project to database
            await project.save();

            // Optionally: Create physical folder structure on server
            // await this.createPhysicalStructure(testStructure, `/projects/${slug}`);

            return res.status(201).json({
                success: true,
                message: 'Project created successfully with test environment',
                data: {
                    project: {
                        id: project._id,
                        name: project.name,
                        slug: project.slug,
                        description: project.description,
                        visibility: project.visibility,
                        testFolder: project.testFolder,
                        createdAt: project.createdAt
                    }
                }
            });

        } catch (error) {
            console.error('Error creating project:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to create project',
                error: error.message
            });
        }
    }

    /**
     * Get complete project hierarchy
     * GET /api/projects/:projectId/structure
     */
    async getProjectStructure(req, res) {
        try {
            const { projectId } = req.params;
            const userId = req.user.id;

            // Find project
            const project = await Project.findOne({
                _id: projectId,
                isDeleted: false
            });

            if (!project) {
                return res.status(404).json({
                    success: false,
                    message: 'Project not found'
                });
            }

            // Check access
            const hasAccess = await project.hasAccess(userId);
            if (!hasAccess) {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have access to this project'
                });
            }

            // Return complete structure
            return res.status(200).json({
                success: true,
                data: {
                    projectId: project._id,
                    projectName: project.name,
                    rootPath: project.testFolder.rootPath,
                    structure: project.testFolder.structure,
                    stats: {
                        totalFiles: project.testFolder.totalFiles,
                        totalFolders: project.testFolder.totalFolders,
                        generated: project.testFolder.generated,
                        generatedAt: project.testFolder.generatedAt
                    }
                }
            });

        } catch (error) {
            console.error('Error fetching project structure:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch project structure',
                error: error.message
            });
        }
    }

    /**
     * Add file or folder to project structure
     * POST /api/projects/:projectId/structure/add
     */
    async addToStructure(req, res) {
        try {
            const { projectId } = req.params;
            const { parentPath, name, type, content = '' } = req.body;
            const userId = req.user.id;

            if (!name || !type) {
                return res.status(400).json({
                    success: false,
                    message: 'Name and type are required'
                });
            }

            if (!['file', 'folder'].includes(type)) {
                return res.status(400).json({
                    success: false,
                    message: 'Type must be either "file" or "folder"'
                });
            }

            // Find project
            const project = await Project.findOne({
                _id: projectId,
                isDeleted: false
            });

            if (!project) {
                return res.status(404).json({
                    success: false,
                    message: 'Project not found'
                });
            }

            // Check access
            const hasAccess = await project.hasAccess(userId);
            if (!hasAccess) {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have access to this project'
                });
            }

            // Add new item to structure
            const newItem = {
                name,
                type,
                ...(type === 'file' && { content }),
                ...(type === 'folder' && { children: [] })
            };

            const updatedStructure = this.addItemToStructure(
                project.testFolder.structure,
                parentPath,
                newItem
            );

            if (!updatedStructure) {
                return res.status(404).json({
                    success: false,
                    message: 'Parent path not found in structure'
                });
            }

            // Update counts
            const counts = this.countFilesAndFolders(updatedStructure);
            project.testFolder.structure = updatedStructure;
            project.testFolder.totalFiles = counts.files;
            project.testFolder.totalFolders = counts.folders;

            await project.save();

            return res.status(200).json({
                success: true,
                message: `${type} added successfully`,
                data: {
                    structure: project.testFolder.structure,
                    stats: {
                        totalFiles: project.testFolder.totalFiles,
                        totalFolders: project.testFolder.totalFolders
                    }
                }
            });

        } catch (error) {
            console.error('Error adding to structure:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to add item to structure',
                error: error.message
            });
        }
    }

    // Helper methods for generating file contents
    getSampleTestContent() {
        return `package com.automation.tests;

import org.testng.annotations.Test;
import org.testng.Assert;

public class SampleTest {
    
    @Test
    public void sampleTest() {
        System.out.println("Sample Test Executed");
        Assert.assertTrue(true, "Sample test passed");
    }
}`;
    }

    getBasePageContent() {
        return `package com.automation.pages;

import org.openqa.selenium.WebDriver;
import org.openqa.selenium.support.PageFactory;

public class BasePage {
    protected WebDriver driver;
    
    public BasePage(WebDriver driver) {
        this.driver = driver;
        PageFactory.initElements(driver, this);
    }
}`;
    }

    getDriverManagerContent() {
        return `package com.automation.utils;

import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import io.github.bonigarcia.wdm.WebDriverManager;

public class DriverManager {
    private static ThreadLocal<WebDriver> driver = new ThreadLocal<>();
    
    public static WebDriver getDriver() {
        if (driver.get() == null) {
            WebDriverManager.chromedriver().setup();
            driver.set(new ChromeDriver());
        }
        return driver.get();
    }
    
    public static void quitDriver() {
        if (driver.get() != null) {
            driver.get().quit();
            driver.remove();
        }
    }
}`;
    }

    getConfigReaderContent() {
        return `package com.automation.utils;

import java.io.FileInputStream;
import java.util.Properties;

public class ConfigReader {
    private static Properties properties;
    
    static {
        try {
            properties = new Properties();
            FileInputStream fis = new FileInputStream("src/test/resources/config/config.properties");
            properties.load(fis);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
    
    public static String getProperty(String key) {
        return properties.getProperty(key);
    }
}`;
    }

    getRestAssuredHelperContent() {
        return `package com.automation.api;

import io.restassured.RestAssured;
import io.restassured.response.Response;
import io.restassured.specification.RequestSpecification;

public class RestAssuredHelper {
    
    public static Response sendGetRequest(String endpoint) {
        RequestSpecification request = RestAssured.given();
        return request.get(endpoint);
    }
    
    public static Response sendPostRequest(String endpoint, String body) {
        RequestSpecification request = RestAssured.given();
        request.header("Content-Type", "application/json");
        return request.body(body).post(endpoint);
    }
}`;
    }

    getApiTestContent() {
        return `package com.automation.api;

import org.testng.annotations.Test;
import io.restassured.response.Response;
import static org.testng.Assert.*;

public class ApiTest {
    
    @Test
    public void testGetRequest() {
        Response response = RestAssuredHelper.sendGetRequest("https://jsonplaceholder.typicode.com/posts/1");
        assertEquals(response.getStatusCode(), 200);
    }
}`;
    }

    getTestRunnerContent() {
        return `package com.automation.runners;

import io.cucumber.testng.AbstractTestNGCucumberTests;
import io.cucumber.testng.CucumberOptions;

@CucumberOptions(
    features = "src/test/resources/features",
    glue = "com.automation.stepdefinitions",
    plugin = {"pretty", "html:target/cucumber-reports.html"}
)
public class TestRunner extends AbstractTestNGCucumberTests {
}`;
    }

    getSampleFeatureContent() {
        return `Feature: Sample Feature

  Scenario: Sample Scenario
    Given I have a sample test
    When I execute the test
    Then the test should pass`;
    }

    getConfigPropertiesContent() {
        return `# Application Configuration
base.url=https://example.com
browser=chrome
timeout=30
implicit.wait=10

# API Configuration
api.base.url=https://api.example.com
api.key=your-api-key`;
    }

    getTestNGXmlContent() {
        return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE suite SYSTEM "https://testng.org/testng-1.0.dtd">
<suite name="Test Automation Suite" parallel="false">
    <test name="Sample Tests">
        <classes>
            <class name="com.automation.tests.SampleTest"/>
            <class name="com.automation.api.ApiTest"/>
        </classes>
    </test>
</suite>`;
    }

    getPomXmlContent(projectName) {
        return `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>com.automation</groupId>
    <artifactId>${projectName.toLowerCase().replace(/\s+/g, '-')}</artifactId>
    <version>1.0-SNAPSHOT</version>

    <properties>
        <maven.compiler.source>11</maven.compiler.source>
        <maven.compiler.target>11</maven.compiler.target>
        <selenium.version>4.15.0</selenium.version>
        <testng.version>7.8.0</testng.version>
        <cucumber.version>7.14.0</cucumber.version>
        <rest-assured.version>5.3.2</rest-assured.version>
    </properties>

    <dependencies>
        <!-- Selenium -->
        <dependency>
            <groupId>org.seleniumhq.selenium</groupId>
            <artifactId>selenium-java</artifactId>
            <version>\${selenium.version}</version>
        </dependency>

        <!-- TestNG -->
        <dependency>
            <groupId>org.testng</groupId>
            <artifactId>testng</artifactId>
            <version>\${testng.version}</version>
        </dependency>

        <!-- Cucumber -->
        <dependency>
            <groupId>io.cucumber</groupId>
            <artifactId>cucumber-java</artifactId>
            <version>\${cucumber.version}</version>
        </dependency>
        <dependency>
            <groupId>io.cucumber</groupId>
            <artifactId>cucumber-testng</artifactId>
            <version>\${cucumber.version}</version>
        </dependency>

        <!-- Rest Assured -->
        <dependency>
            <groupId>io.rest-assured</groupId>
            <artifactId>rest-assured</artifactId>
            <version>\${rest-assured.version}</version>
        </dependency>

        <!-- WebDriverManager -->
        <dependency>
            <groupId>io.github.bonigarcia</groupId>
            <artifactId>webdrivermanager</artifactId>
            <version>5.6.2</version>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-surefire-plugin</artifactId>
                <version>3.0.0</version>
                <configuration>
                    <suiteXmlFiles>
                        <suiteXmlFile>src/test/resources/testng.xml</suiteXmlFile>
                    </suiteXmlFiles>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>`;
    }

    getReadmeContent(projectName) {
        return `# ${projectName} - Test Automation Framework

This is an auto-generated test automation framework using:
- Selenium WebDriver
- TestNG
- Cucumber
- Rest Assured
- Maven

## Setup
1. Ensure Java 11+ and Maven are installed
2. Run: \`mvn clean install\`

## Run Tests
- All tests: \`mvn test\`
- Specific suite: \`mvn test -DsuiteXmlFile=testng.xml\`

## Structure
- \`src/test/java/com/automation/tests\` - Test classes
- \`src/test/java/com/automation/pages\` - Page objects
- \`src/test/java/com/automation/utils\` - Utilities
- \`src/test/java/com/automation/api\` - API tests
- \`src/test/resources/features\` - Cucumber feature files`;
    }

    getGitIgnoreContent() {
        return `target/
.idea/
*.iml
.classpath
.project
.settings/
*.log
test-output/`;
    }

    // Helper to count files and folders
    countFilesAndFolders(node) {
        let files = 0;
        let folders = 0;

        if (node.type === 'file') {
            files = 1;
        } else if (node.type === 'folder') {
            folders = 1;
            if (node.children) {
                node.children.forEach(child => {
                    const counts = this.countFilesAndFolders(child);
                    files += counts.files;
                    folders += counts.folders;
                });
            }
        }

        return { files, folders };
    }

    // Helper to add item to structure recursively
    addItemToStructure(node, parentPath, newItem) {
        if (!parentPath || parentPath === '' || parentPath === '/') {
            // Add to root
            if (node.children) {
                node.children.push(newItem);
            }
            return node;
        }

        const pathParts = parentPath.split('/').filter(p => p);

        const findAndAdd = (currentNode, parts) => {
            if (parts.length === 0) {
                if (currentNode.children) {
                    currentNode.children.push(newItem);
                }
                return true;
            }

            const nextPart = parts[0];
            if (currentNode.children) {
                for (let child of currentNode.children) {
                    if (child.name === nextPart) {
                        return findAndAdd(child, parts.slice(1));
                    }
                }
            }
            return false;
        };

        const success = findAndAdd(node, pathParts);
        return success ? node : null;
    }

    // Optional: Create physical folder structure
    async createPhysicalStructure(node, basePath) {
        const fullPath = path.join(basePath, node.name);

        if (node.type === 'folder') {
            await fs.mkdir(fullPath, { recursive: true });
            if (node.children) {
                for (const child of node.children) {
                    await this.createPhysicalStructure(child, fullPath);
                }
            }
        } else if (node.type === 'file') {
            await fs.writeFile(fullPath, node.content || '', 'utf8');
        }
    }
}

module.exports = new ProjectController();