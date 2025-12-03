class TestNGService {
    async generateTestClass(endpoint, projectConfig, testCases) {
        console.log(`[TestNGService] Generating TestNG class | Endpoint: ${endpoint.path}`);

        try {
            const className = this.generateClassName(endpoint);
            const packageName = projectConfig.packageName || 'com.imagefetch.tests';

            const content = `package ${packageName};

import org.testng.annotations.*;
import static org.testng.Assert.*;
import java.net.http.*;
import java.net.URI;

public class ${className} {
    
    private static final String BASE_URL = "${projectConfig.baseUrl || 'http://localhost:8080'}";
    private static final String ENDPOINT = "${endpoint.path}";
    private HttpClient httpClient;
    
    @BeforeClass
    public void setup() {
        httpClient = HttpClient.newHttpClient();
        System.out.println("Test setup completed");
    }
    
    @BeforeMethod
    public void beforeTest() {
        System.out.println("Starting test execution");
    }
    
    @Test(priority = 1)
    public void test${endpoint.method}Success() throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(BASE_URL + ENDPOINT))
            .${endpoint.method}(HttpRequest.BodyPublishers.noBody())
            .header("Content-Type", "application/json")
            .build();
        
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        
        assertEquals(response.statusCode(), ${this.getExpectedStatus(endpoint.method)});
        assertNotNull(response.body());
    }
    
    @AfterMethod
    public void afterTest() {
        System.out.println("Test execution completed");
    }
    
    @AfterClass
    public void tearDown() {
        System.out.println("Test cleanup completed");
    }
}`;

            console.log(`[TestNGService] TestNG class generated | ClassName: ${className}`);

            return {
                testClass: {
                    name: className,
                    packageName: packageName,
                    content: content
                }
            };
        } catch (error) {
            console.error(`[TestNGService] TestNG generation failed | Error: ${error.message}`);
            throw error;
        }
    }

    generateClassName(endpoint) {
        const method = endpoint.method.charAt(0).toUpperCase() + endpoint.method.slice(1).toLowerCase();
        const pathParts = endpoint.path.split('/').filter(p => p && !p.startsWith(':'));
        const pathName = pathParts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
        return `${method}${pathName}Test`;
    }

    getExpectedStatus(method) {
        const codes = { 'GET': 200, 'POST': 201, 'PUT': 200, 'PATCH': 200, 'DELETE': 204 };
        return codes[method] || 200;
    }

    async generateTestSuite(testSuite, projectConfig) {
        console.log(`[TestNGService] Generating TestNG suite | Suite: ${testSuite.name}`);

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE suite SYSTEM "http://testng.org/testng-1.0.dtd">
<suite name="${testSuite.name}" parallel="methods" thread-count="5">
    <test name="API Tests">
        <packages>
            <package name="com.imagefetch.tests.*"/>
        </packages>
    </test>
</suite>`;

        return { content: xml, type: 'xml' };
    }
}

module.exports = new TestNGService();